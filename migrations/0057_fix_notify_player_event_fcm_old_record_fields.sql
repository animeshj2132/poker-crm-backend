-- ============================================================================
-- 0057_fix_notify_player_event_fcm_old_record_fields.sql
-- Purpose:
--   Fix runtime errors like:
--   "record \"old\" has no field \"credit_enabled\""
--   when notify_player_event_fcm() is fired by non-players tables
--   (e.g. buyin_requests / buyout_requests).
--
-- Root cause:
--   The prior function evaluated OLD.credit_enabled / NEW.credit_enabled in an
--   ELSIF condition that is parsed for all trigger tables.
--
-- Strategy:
--   Keep existing behavior, but move players-specific field checks inside a
--   TG_TABLE_NAME = 'players' branch so non-players triggers never touch those
--   columns.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_player_event_fcm()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  payload            JSONB;
  notification_title TEXT;
  notification_body  TEXT;
  http_url           TEXT;
  http_headers       JSONB;
  service_key        TEXT;
  resolved_uuid      TEXT;
  session_player_id  UUID;
  tournament_club_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'waitlist_entries' THEN
    IF TG_OP != 'UPDATE'
       OR OLD.status = NEW.status
       OR NEW.status NOT IN ('SEATED', 'completed')
    THEN
      RETURN NEW;
    END IF;

    notification_title := '🎉 Your Table is Ready!';
    notification_body := 'You have been seated'
      || CASE
           WHEN NEW.table_number IS NOT NULL THEN ' at Table ' || NEW.table_number::text
           ELSE ''
         END
      || '. Please come to your table now.';

    IF NEW.player_id IS NOT NULL AND NEW.player_id != '' THEN
      SELECT id::text INTO resolved_uuid
      FROM players
      WHERE club_id = NEW.club_id
        AND (id::text = NEW.player_id OR player_id = NEW.player_id)
      LIMIT 1;
    END IF;
    IF resolved_uuid IS NULL THEN
      RETURN NEW;
    END IF;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', resolved_uuid
    );

  ELSIF TG_TABLE_NAME = 'financial_transactions' THEN
    IF NEW.type NOT IN ('Deposit', 'Cashout') THEN
      RETURN NEW;
    END IF;
    IF NOT (
      (TG_OP = 'INSERT' AND NEW.status = 'Completed') OR
      (TG_OP = 'UPDATE' AND OLD.status != 'Completed' AND NEW.status = 'Completed')
    ) THEN
      RETURN NEW;
    END IF;

    IF NEW.type = 'Deposit' THEN
      notification_title := '💰 Funds Added to Wallet!';
      notification_body := '₹' || NEW.amount::text || ' has been added to your account.';
    ELSE
      notification_title := '✅ Cashout Processed!';
      notification_body := '₹' || NEW.amount::text || ' has been transferred out successfully.';
    END IF;

    SELECT id::text INTO resolved_uuid
    FROM players
    WHERE club_id = NEW.club_id
      AND (id::text = NEW.player_id OR player_id = NEW.player_id)
    LIMIT 1;
    IF resolved_uuid IS NULL THEN
      RETURN NEW;
    END IF;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', resolved_uuid
    );

  ELSIF TG_TABLE_NAME = 'credit_requests' THEN
    IF TG_OP != 'UPDATE' OR OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;

    IF NEW.status = 'Approved' THEN
      notification_title := '✅ Credit Request Approved!';
      notification_body := 'Your credit request for ₹' || NEW.amount::text
        || ' has been approved. Your credit limit is now ₹' || NEW.credit_limit::text || '.';
    ELSIF NEW.status = 'Denied' THEN
      notification_title := '❌ Credit Request Not Approved';
      notification_body := 'Your credit request for ₹' || NEW.amount::text || ' was declined.'
        || CASE
             WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason
             ELSE ''
           END;
    ELSE
      RETURN NEW;
    END IF;

    SELECT id::text INTO resolved_uuid
    FROM players
    WHERE club_id = NEW.club_id
      AND (id::text = NEW.player_id OR player_id = NEW.player_id)
    LIMIT 1;
    IF resolved_uuid IS NULL THEN
      RETURN NEW;
    END IF;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', resolved_uuid
    );

  ELSIF TG_TABLE_NAME = 'players' THEN
    -- IMPORTANT: keep players-field access inside this branch only.
    IF TG_OP = 'UPDATE'
       AND OLD.credit_enabled IS DISTINCT FROM NEW.credit_enabled
       AND OLD.credit_enabled = FALSE
       AND NEW.credit_enabled = TRUE
    THEN
      notification_title := '🎊 Credit Facility Activated!';
      notification_body := 'Your credit facility is now active with a limit of ₹'
        || NEW.credit_limit::text || '. You can use it at the tables.';

      payload := jsonb_build_object(
        'title', notification_title,
        'body', notification_body,
        'playerUuid', NEW.id::text
      );
    ELSIF TG_OP = 'UPDATE'
       AND OLD.kyc_status IS DISTINCT FROM NEW.kyc_status
       AND NEW.kyc_status IS NOT NULL
    THEN
      IF NEW.kyc_status IN ('approved', 'Approved') THEN
        notification_title := '✅ KYC Verified!';
        notification_body := 'Your identity has been verified. You now have full access to all features.';
      ELSIF NEW.kyc_status IN ('rejected', 'Rejected') THEN
        notification_title := '❌ KYC Verification Failed';
        notification_body := 'Your KYC documents could not be verified. Please resubmit or contact support.';
      ELSE
        RETURN NEW;
      END IF;

      payload := jsonb_build_object(
        'title', notification_title,
        'body', notification_body,
        'playerUuid', NEW.id::text
      );
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'player_profile_change_requests' THEN
    IF TG_OP != 'UPDATE' OR OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;

    IF NEW.status = 'approved' THEN
      notification_title := '✅ Profile Update Approved';
      notification_body := 'Your request to update your ' || NEW.field_name || ' has been approved.';
    ELSIF NEW.status = 'rejected' THEN
      notification_title := '❌ Profile Update Rejected';
      notification_body := 'Your request to update your ' || NEW.field_name || ' was not approved.'
        || CASE
             WHEN NEW.review_notes IS NOT NULL THEN ' Note: ' || NEW.review_notes
             ELSE ''
           END;
    ELSE
      RETURN NEW;
    END IF;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', NEW.player_id::text
    );

  ELSIF TG_TABLE_NAME = 'fnb_orders' THEN
    IF TG_OP != 'UPDATE' THEN
      RETURN NEW;
    END IF;

    IF OLD.is_accepted IS DISTINCT FROM NEW.is_accepted AND NEW.is_accepted IS NOT NULL THEN
      IF NEW.is_accepted = TRUE THEN
        notification_title := '🍽️ Order Accepted!';
        notification_body := 'Your order'
          || CASE
               WHEN NEW.order_number IS NOT NULL THEN ' #' || NEW.order_number
               ELSE ''
             END
          || ' is being prepared.';
      ELSE
        notification_title := '❌ Order Rejected';
        notification_body := 'Sorry, your order could not be fulfilled.'
          || CASE
               WHEN NEW.rejected_reason IS NOT NULL THEN ' Reason: ' || NEW.rejected_reason
               ELSE ''
             END;
      END IF;
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'ready' THEN
      notification_title := '🔔 Order Ready!';
      notification_body := 'Your order is ready and on its way to Table '
        || COALESCE(NEW.table_number, '?') || '!';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
      notification_title := '✅ Order Delivered!';
      notification_body := 'Your order has been delivered. Enjoy!';
    ELSE
      RETURN NEW;
    END IF;

    IF NEW.player_id IS NOT NULL AND NEW.player_id != '' THEN
      SELECT id::text INTO resolved_uuid
      FROM players
      WHERE club_id = NEW.club_id
        AND (id::text = NEW.player_id OR player_id = NEW.player_id)
      LIMIT 1;
    END IF;
    IF resolved_uuid IS NULL THEN
      RETURN NEW;
    END IF;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', resolved_uuid
    );

  ELSIF TG_TABLE_NAME = 'buyout_requests' THEN
    IF TG_OP != 'UPDATE' OR OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;

    IF NEW.status = 'approved' THEN
      notification_title := '✅ Table Cashout Approved!';
      notification_body := 'Your table cashout of ₹'
        || COALESCE(NEW.requested_amount::text, '0')
        || ' has been approved. Please collect at the cashier.';
    ELSIF NEW.status = 'rejected' THEN
      notification_title := '❌ Table Cashout Rejected';
      notification_body := 'Your cashout request was not approved.'
        || CASE
             WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason
             ELSE ''
           END;
    ELSE
      RETURN NEW;
    END IF;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', NEW.player_id::text
    );

  ELSIF TG_TABLE_NAME = 'buyin_requests' THEN
    IF TG_OP != 'UPDATE' OR OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;

    IF NEW.status = 'approved' THEN
      notification_title := '✅ Buy-in Approved!';
      notification_body := '₹' || COALESCE(NEW.requested_amount::text, '0')
        || ' in chips has been added to your table stack.';
    ELSIF NEW.status = 'rejected' THEN
      notification_title := '❌ Buy-in Request Rejected';
      notification_body := 'Your buy-in request was not approved.'
        || CASE
             WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason
             ELSE ''
           END;
    ELSE
      RETURN NEW;
    END IF;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', NEW.player_id::text
    );

  ELSIF TG_TABLE_NAME = 'tournaments'
        AND TG_OP = 'UPDATE'
        AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status = 'active'
  THEN
    notification_title := '🏆 Tournament Has Started!';
    notification_body := '"' || COALESCE(NEW.name::text, 'The tournament')
      || '" has begun! Good luck to all players.';

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'clubId', NEW.club_id::text
    );

  ELSIF TG_TABLE_NAME = 'tournament_players'
        AND TG_OP = 'UPDATE'
        AND OLD.is_exited IS DISTINCT FROM NEW.is_exited
        AND NEW.is_exited = TRUE
  THEN
    SELECT club_id INTO tournament_club_id
    FROM tournaments
    WHERE id = NEW.tournament_id;

    notification_title := '🃏 You Exited the Tournament';
    notification_body :=
      CASE
        WHEN NEW.exit_balance IS NOT NULL AND NEW.exit_balance > 0
          THEN 'You exited with ₹' || NEW.exit_balance::text || '. Chips credited to your wallet.'
        ELSE 'You have exited the tournament.'
      END
      || CASE
           WHEN NEW.finishing_position IS NOT NULL THEN ' Final position: #' || NEW.finishing_position::text || '.'
           ELSE ''
         END;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', NEW.player_id::text
    );

  ELSIF TG_TABLE_NAME = 'tournament_players'
        AND TG_OP = 'UPDATE'
        AND NEW.prize_amount IS NOT NULL
        AND NEW.prize_amount > 0
        AND (OLD.prize_amount IS NULL OR OLD.prize_amount = 0)
  THEN
    notification_title := '🏆 You Won a Prize!';
    notification_body := 'Congratulations! You finished #'
      || COALESCE(NEW.finishing_position::text, '1')
      || ' and won ₹' || NEW.prize_amount::text || '! Winnings have been added to your wallet.';

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', NEW.player_id::text
    );

  ELSIF TG_TABLE_NAME = 'chat_messages'
        AND TG_OP = 'INSERT'
        AND NEW.sender_type = 'staff'
  THEN
    SELECT cs.player_id INTO session_player_id
    FROM chat_sessions cs
    WHERE cs.id = NEW.session_id
      AND cs.session_type = 'player'
      AND cs.player_id IS NOT NULL
      AND cs.status NOT IN ('resolved', 'closed')
    LIMIT 1;

    IF session_player_id IS NULL THEN
      RETURN NEW;
    END IF;

    notification_title := '💬 New Message from Support';
    notification_body := COALESCE(NEW.sender_name, 'Staff') || ': '
      || CASE
           WHEN length(NEW.message) > 100 THEN left(NEW.message, 97) || '...'
           ELSE NEW.message
         END;

    payload := jsonb_build_object(
      'title', notification_title,
      'body', notification_body,
      'playerUuid', session_player_id::text
    );

  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    http_url := COALESCE(
      NULLIF(current_setting('app.settings.fcm_edge_url', true), ''),
      'https://vwzpqcycaovwvaovfsgg.supabase.co/functions/v1/send-notification'
    );
    service_key := COALESCE(
      NULLIF(current_setting('app.settings.service_role_key', true), ''),
      ''
    );
    http_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    );

    PERFORM net.http_post(
      url := http_url,
      headers := http_headers,
      body := payload
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Player event FCM failed [%][%] payload=% err=%',
      TG_TABLE_NAME, TG_OP, payload, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  RAISE NOTICE '0057 applied: notify_player_event_fcm() patched for OLD/NEW field safety.';
END $$;

