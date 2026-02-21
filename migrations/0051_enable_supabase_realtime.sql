-- Enable Supabase Realtime on ALL tables that need live updates
-- Verified against actual DB tables (49 tables total in public schema)
-- Currently enabled: buyin_requests, buyout_requests, credit_requests,
--                    financial_transactions, fnb_orders, players, tables

ALTER PUBLICATION supabase_realtime SET TABLE
  -- Already enabled (keeping these)
  players,
  tables,
  buyin_requests,
  buyout_requests,
  financial_transactions,
  credit_requests,
  fnb_orders,
  -- Staff & notifications
  staff,
  push_notifications,
  notification_read_status,
  -- Chat
  chat_sessions,
  chat_messages,
  -- Tournaments
  tournaments,
  tournament_players,
  -- Player requests
  player_profile_change_requests,
  -- Waitlist & leave
  waitlist_entries,
  leave_applications,
  -- Offers
  staff_offers,
  -- Audit & feedback (read-only visibility)
  audit_logs,
  player_feedback;
