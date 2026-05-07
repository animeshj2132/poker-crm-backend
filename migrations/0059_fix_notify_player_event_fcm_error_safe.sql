-- ============================================================================
-- 0059_fix_notify_player_event_fcm_error_safe.sql
-- Purpose:
--   Fix runtime error "record \"old\" has no field \"status\"" thrown when
--   notify_player_event_fcm() fires on chat_messages INSERT.
--
-- Root cause:
--   The live DB version of notify_player_event_fcm() differs from migration
--   0057 (likely corrupted during paste into Supabase SQL editor). It accesses
--   OLD.status in a context where chat_messages has no status column, causing
--   PostgreSQL error 42703 (undefined_column) which propagates and makes the
--   chat send API return 500.
--
-- Strategy:
--   Wrap the entire function body in a top-level EXCEPTION WHEN OTHERS block
--   so any field-access error is silently swallowed and the triggering INSERT
--   always succeeds. This is safe: the trigger only sends push notifications,
--   so a trigger failure should never break application writes.
--
--   This replaces whatever version is currently live in the DB with a version
--   that is identical to 0057 but with the outer safety wrapper.
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
  -- Outer safety wrapper: any error in this trigger must never fail the DML.
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
        resolved_uuid := NEW.player_id::text;
      ELSE
        resolved_uuid := NULL;
      END IF;

      IF resolved_uuid IS NULL THEN
        RETURN NEW;
      END IF;

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
        'playerUuid', resolved_uuid
      );

    ELSIF TG_TABLE_NAME = 'financial_transactions' THEN
      IF TG_OP != 'INSERT' THEN
        RETURN NEW;
      END IF;

      IF NEW.type IN ('Deposit', 'Credit', 'Bonus') THEN
        notification_title := '💰 Money Added to Your Wallet';
        notification_body  := '₹' || NEW.amount::text || ' has been added to your wallet.'
          || CASE WHEN NEW.note IS NOT NULL AND NEW.note != '' THEN ' Note: ' || NEW.note ELSE '' END;
      ELSIF NEW.type = 'Cashout' THEN
        notification_title := '💸 Cashout Processed';
        notification_body  := '₹' || NEW.amount::text || ' cashout has been processed.'
          || CASE WHEN NEW.note IS NOT NULL AND NEW.note != '' THEN ' Note: ' || NEW.note ELSE '' END;
      ELSE
        RETURN NEW;
      END IF;

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'credit_requests' THEN
      IF TG_OP != 'UPDATE'
         OR OLD.status = NEW.status
         OR NEW.status NOT IN ('approved', 'rejected')
      THEN
        RETURN NEW;
      END IF;

      IF NEW.status = 'approved' THEN
        notification_title := '✅ Credit Request Approved';
        notification_body  := 'Your credit request for ₹' || NEW.amount::text || ' has been approved.';
      ELSE
        notification_title := '❌ Credit Request Rejected';
        notification_body  := 'Your credit request for ₹' || NEW.amount::text || ' was rejected.'
          || CASE WHEN NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != '' THEN ' Reason: ' || NEW.rejection_reason ELSE '' END;
      END IF;

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'buyin_requests' THEN
      IF TG_OP != 'UPDATE'
         OR OLD.status = NEW.status
         OR NEW.status NOT IN ('approved', 'rejected')
      THEN
        RETURN NEW;
      END IF;

      IF NEW.status = 'approved' THEN
        notification_title := '✅ Buy-in Approved';
        notification_body  := 'Your buy-in request has been approved. Please proceed to the cashier.';
      ELSE
        notification_title := '❌ Buy-in Rejected';
        notification_body  := 'Your buy-in request has been rejected.';
      END IF;

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'buyout_requests' THEN
      IF TG_OP != 'UPDATE'
         OR OLD.status = NEW.status
         OR NEW.status NOT IN ('approved', 'rejected')
      THEN
        RETURN NEW;
      END IF;

      IF NEW.status = 'approved' THEN
        notification_title := '✅ Cashout Approved';
        notification_body  := 'Your cashout request has been approved.';
      ELSE
        notification_title := '❌ Cashout Rejected';
        notification_body  := 'Your cashout request has been rejected.';
      END IF;

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'players'
          AND TG_OP = 'UPDATE'
          AND OLD.credit_enabled IS DISTINCT FROM NEW.credit_enabled
          AND NEW.credit_enabled = true
    THEN
      notification_title := '🎉 Credit Enabled';
      notification_body  := 'You have been granted credit access. You can now request credit at the tables.';

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
        'playerUuid', NEW.uuid::text
      );

    ELSIF TG_TABLE_NAME = 'tournament_players'
          AND TG_OP = 'UPDATE'
          AND NEW.prize_amount IS NOT NULL
          AND NEW.prize_amount > 0
          AND (OLD.prize_amount IS NULL OR OLD.prize_amount = 0)
    THEN
      notification_title := '🏆 You Won a Prize!';
      notification_body  := 'Congratulations! You finished #'
        || COALESCE(NEW.finishing_position::text, '1')
        || ' and won ₹' || NEW.prize_amount::text || '! Winnings have been added to your wallet.';

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
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
      notification_body  := COALESCE(NEW.sender_name, 'Staff') || ': '
        || CASE
             WHEN length(NEW.message) > 100 THEN left(NEW.message, 97) || '...'
             ELSE NEW.message
           END;

      payload := jsonb_build_object(
        'title', notification_title,
        'body',  notification_body,
        'playerUuid', session_player_id::text
      );

    ELSE
      RETURN NEW;
    END IF;

    -- Send the push notification via HTTP edge function
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
        url     := http_url,
        headers := http_headers,
        body    := payload
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_player_event_fcm HTTP failed [%][%] payload=% err=%',
        TG_TABLE_NAME, TG_OP, payload, SQLERRM;
    END;

  EXCEPTION WHEN OTHERS THEN
    -- Safety net: log but never let trigger errors fail the application write.
    RAISE WARNING 'notify_player_event_fcm failed [%][%] err=%',
      TG_TABLE_NAME, TG_OP, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  RAISE NOTICE '0059 applied: notify_player_event_fcm() wrapped with outer EXCEPTION safety block.';
END $$;
