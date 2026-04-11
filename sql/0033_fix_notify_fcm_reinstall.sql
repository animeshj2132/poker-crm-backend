-- ============================================================
-- FIX notify_fcm() after broken PUSH NOTIFICATION SETUP
-- ============================================================
-- Problems in the original script:
-- 1) jsonb_build_object used CASE ... THEN NEW.player_id — PL/pgSQL still
--    resolves NEW.player_id against EACH table's row type, so INSERT on
--    tournaments/menu_items/tables fails: "record NEW has no field player_id".
--    Fix: use to_jsonb(NEW)->>'player_id' (NULL when column absent).
-- 2) "tables" branch used NEW.game_type / NEW.name — real columns are
--    table_type, table_number (see TypeORM Table entity).
-- 3) net.http_post + current_setting('request.headers') is empty for app
--    connections; wrap in exception so INSERT still succeeds if HTTP fails.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_fcm()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  notification_title TEXT;
  notification_body TEXT;
  player_id_text TEXT;
  http_url TEXT;
  http_headers JSONB;
BEGIN
  player_id_text := to_jsonb(NEW)->>'player_id';

  IF (TG_TABLE_NAME = 'tournaments') THEN
    notification_title := '🏆 New Tournament!';
    notification_body := 'New tournament "' || COALESCE(NEW.name::text, 'Tournament') || '" has been added! Join now.';

  ELSIF (TG_TABLE_NAME = 'staff_offers') THEN
    notification_title := '🔥 New Special Offer!';
    notification_body := COALESCE(NEW.title::text, 'New offer');

  ELSIF (TG_TABLE_NAME = 'menu_items') THEN
    notification_title := '🍔 New Menu Item!';
    notification_body := 'Try our new ' || COALESCE(NEW.name::text, 'item') || '! Check the Food & Beverage menu.';

  ELSIF (TG_TABLE_NAME = 'tables') THEN
    notification_title := '🃏 New Live Table!';
    notification_body := 'New ' || COALESCE(NEW.table_type::text, 'Poker') || ' table number ' ||
      COALESCE(NEW.table_number::text, '?') || ' is now live! Grab your seat.';

  ELSIF (TG_TABLE_NAME = 'unified_chat_requests') THEN
    IF (TG_OP = 'INSERT') THEN
      notification_title := '💬 New Message';
      notification_body := COALESCE(NEW.message::text, 'New chat message');
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status::text = 'resolved') THEN
      notification_title := '✅ Message Resolved';
      notification_body := 'Your request has been resolved: ' || COALESCE(NEW.resolution_note::text, 'No additional notes.');
    ELSE
      RETURN NEW;
    END IF;

  ELSE
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'title', notification_title,
    'body', notification_body,
    'playerId', player_id_text
  );

  RAISE NOTICE 'FCM notify [%] %', TG_TABLE_NAME, payload;

  -- Optional: call Edge Function via pg_net (only if extension + settings exist)
  BEGIN
    http_url := current_setting('app.settings.fcm_edge_url', true);
    IF http_url IS NULL OR http_url = '' THEN
      -- Skip HTTP when not configured (normal for API-driven inserts)
      NULL;
    ELSE
      http_headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), '')
      );
      PERFORM net.http_post(
        url := http_url,
        headers := http_headers,
        body := payload
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FCM http_post skipped or failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers (same as your original intent)
DROP TRIGGER IF EXISTS trigger_notify_tournament_created ON tournaments;
CREATE TRIGGER trigger_notify_tournament_created
  AFTER INSERT ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION notify_fcm();

DROP TRIGGER IF EXISTS trigger_notify_offer_created ON staff_offers;
CREATE TRIGGER trigger_notify_offer_created
  AFTER INSERT ON staff_offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_fcm();

DROP TRIGGER IF EXISTS trigger_notify_fb_created ON menu_items;
CREATE TRIGGER trigger_notify_fb_created
  AFTER INSERT ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_fcm();

DROP TRIGGER IF EXISTS trigger_notify_table_created ON tables;
CREATE TRIGGER trigger_notify_table_created
  AFTER INSERT ON tables
  FOR EACH ROW
  EXECUTE FUNCTION notify_fcm();

DROP TRIGGER IF EXISTS trigger_notify_chat_update ON unified_chat_requests;
CREATE TRIGGER trigger_notify_chat_update
  AFTER INSERT OR UPDATE ON unified_chat_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_fcm();

DO $$ BEGIN
  RAISE NOTICE '✅ 0033: notify_fcm() fixed and triggers reinstalled.';
  RAISE NOTICE '   Set app.settings.fcm_edge_url and app.settings.service_role_key via ALTER DATABASE ... SET if you use pg_net.';
END $$;
