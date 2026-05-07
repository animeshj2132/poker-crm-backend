-- ============================================================================
-- 0061_fix_notify_player_event_fcm_hardcode_key.sql
-- Purpose:
--   Fix FCM push notifications not authenticating with the edge function.
--
-- Root cause:
--   ALTER DATABASE SET "app.settings.service_role_key" = '...' requires
--   Supabase internal superuser (supabase_admin) — the postgres role cannot
--   set custom GUC parameters at the database level. The trigger function was
--   falling back to '' (empty string), causing 401 Unauthorized from the
--   FCM edge function.
--
-- Fix:
--   Hardcode the service_role_key and edge function URL as fallback defaults
--   inside the function itself. current_setting() still takes priority if
--   the DB-level setting is ever configured in the future.
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
  session_player_id  UUID;
BEGIN
  -- Outer safety wrapper: any error here must NEVER fail the triggering DML.
  BEGIN

    -- ----------------------------------------------------------------
    -- Route by table name FIRST, then check OLD/NEW fields safely
    -- inside the table-specific block. This avoids PostgreSQL evaluating
    -- OLD/NEW field access in compound ELSIF conditions across tables.
    -- ----------------------------------------------------------------

    IF TG_TABLE_NAME = 'waitlist_entries' THEN

      -- Only fire on UPDATE where status changed to a seated/completed state
      IF TG_OP != 'UPDATE'
         OR OLD.status = NEW.status
         OR NEW.status NOT IN ('SEATED', 'completed')
      THEN
        RETURN NEW;
      END IF;

      notification_title := '🎉 Your Table is Ready!';
      notification_body  := 'You have been seated'
        || CASE
             WHEN NEW.table_number IS NOT NULL
               THEN ' at Table ' || NEW.table_number::text
             ELSE ''
           END
        || '. Please come to your table now.';

      IF NEW.player_id IS NULL OR NEW.player_id::text = '' THEN
        RETURN NEW;
      END IF;

      payload := jsonb_build_object(
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'financial_transactions' THEN

      -- Only fire on INSERT for credit/deposit/cashout types
      IF TG_OP != 'INSERT' THEN
        RETURN NEW;
      END IF;

      IF NEW.type IN ('Deposit', 'Credit', 'Bonus') THEN
        notification_title := '💰 Money Added to Your Wallet';
        notification_body  := '₹' || NEW.amount::text || ' has been added to your wallet.'
          || CASE
               WHEN NEW.notes IS NOT NULL AND NEW.notes != ''
                 THEN ' Note: ' || NEW.notes
               ELSE ''
             END;
      ELSIF NEW.type = 'Cashout' THEN
        notification_title := '💸 Cashout Processed';
        notification_body  := '₹' || NEW.amount::text || ' cashout has been processed.'
          || CASE
               WHEN NEW.notes IS NOT NULL AND NEW.notes != ''
                 THEN ' Note: ' || NEW.notes
               ELSE ''
             END;
      ELSE
        RETURN NEW;
      END IF;

      payload := jsonb_build_object(
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'credit_requests' THEN

      -- Only fire on UPDATE where status changed to Approved or Denied
      IF TG_OP != 'UPDATE'
         OR OLD.status = NEW.status
         OR NEW.status NOT IN ('Approved', 'Denied')
      THEN
        RETURN NEW;
      END IF;

      IF NEW.status = 'Approved' THEN
        notification_title := '✅ Credit Request Approved';
        notification_body  := 'Your credit request for ₹' || NEW.amount::text || ' has been approved.';
      ELSE
        notification_title := '❌ Credit Request Rejected';
        notification_body  := 'Your credit request for ₹' || NEW.amount::text || ' was rejected.'
          || CASE
               WHEN NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != ''
                 THEN ' Reason: ' || NEW.rejection_reason
               ELSE ''
             END;
      END IF;

      payload := jsonb_build_object(
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'buyin_requests' THEN

      -- Only fire on UPDATE where status changed to approved/rejected
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
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'buyout_requests' THEN

      -- Only fire on UPDATE where status changed to approved/rejected
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
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'players' THEN

      -- Nested IF: OLD.credit_enabled only accessed here, safely inside players block
      IF TG_OP != 'UPDATE'
         OR NOT (OLD.credit_enabled IS DISTINCT FROM NEW.credit_enabled)
         OR NEW.credit_enabled IS NOT TRUE
      THEN
        RETURN NEW;
      END IF;

      notification_title := '🎉 Credit Enabled';
      notification_body  := 'You have been granted credit access. You can now request credit at the tables.';

      payload := jsonb_build_object(
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', NEW.id::text   -- players PK is "id", not "uuid"
      );

    ELSIF TG_TABLE_NAME = 'tournament_players' THEN

      -- Nested IF: OLD.prize_amount only accessed here, safely inside tournament_players block
      IF TG_OP != 'UPDATE'
         OR NEW.prize_amount IS NULL
         OR NEW.prize_amount <= 0
         OR NOT (OLD.prize_amount IS NULL OR OLD.prize_amount = 0)
      THEN
        RETURN NEW;
      END IF;

      notification_title := '🏆 You Won a Prize!';
      notification_body  := 'Congratulations! You finished #'
        || COALESCE(NEW.finishing_position::text, '1')
        || ' and won ₹' || NEW.prize_amount::text || '! Winnings have been added to your wallet.';

      payload := jsonb_build_object(
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', NEW.player_id::text
      );

    ELSIF TG_TABLE_NAME = 'chat_messages' THEN

      -- Only fire on INSERT where staff sends a message (notify the player)
      IF TG_OP != 'INSERT' OR NEW.sender_type != 'staff' THEN
        RETURN NEW;
      END IF;

      SELECT cs.player_id INTO session_player_id
      FROM   chat_sessions cs
      WHERE  cs.id = NEW.session_id
        AND  cs.session_type = 'player'
        AND  cs.player_id IS NOT NULL
        AND  cs.status NOT IN ('resolved', 'closed')
      LIMIT 1;

      IF session_player_id IS NULL THEN
        RETURN NEW;
      END IF;

      notification_title := '💬 New Message from Support';
      notification_body  := COALESCE(NEW.sender_name, 'Staff') || ': '
        || CASE
             WHEN length(NEW.message) > 100
               THEN left(NEW.message, 97) || '...'
             ELSE NEW.message
           END;

      payload := jsonb_build_object(
        'title',      notification_title,
        'body',       notification_body,
        'playerUuid', session_player_id::text
      );

    ELSE
      RETURN NEW;
    END IF;

    -- ----------------------------------------------------------------
    -- Send push notification via Supabase Edge Function
    -- ----------------------------------------------------------------
    BEGIN
      -- current_setting() takes priority; hardcoded values are the fallback.
      -- ALTER DATABASE SET cannot be used by the postgres role in Supabase
      -- (requires supabase_admin superuser), so we embed the defaults here.
      http_url := COALESCE(
        NULLIF(current_setting('app.settings.fcm_edge_url', true), ''),
        'https://vwzpqcycaovwvaovfsgg.supabase.co/functions/v1/send-notification'
      );
      service_key := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3enBxY3ljYW92d3Zhb3Zmc2dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwNzkwOSwiZXhwIjoyMDg5OTgzOTA5fQ.urv-p7WOPcKKdhrJ-1XjgLDOLZQq_M-VUUacrFTjsFk'
      );
      http_headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_key
      );

      PERFORM net.http_post(
        url     := http_url,
        headers := http_headers,
        body    := payload
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_player_event_fcm HTTP post failed [%][%] payload=% err=%',
        TG_TABLE_NAME, TG_OP, payload, SQLERRM;
    END;

  EXCEPTION WHEN OTHERS THEN
    -- Safety net: log but never fail the DML.
    RAISE WARNING 'notify_player_event_fcm failed [%][%] err=%',
      TG_TABLE_NAME, TG_OP, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  RAISE NOTICE '0061 applied: notify_player_event_fcm() now has hardcoded fallback service_role_key and edge URL.';
END $$;
