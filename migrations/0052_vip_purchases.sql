-- VIP Purchases table - tracks player purchases of VIP products
CREATE TABLE IF NOT EXISTS public.vip_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.vip_products(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vip_purchases_club ON vip_purchases(club_id);
CREATE INDEX IF NOT EXISTS idx_vip_purchases_player ON vip_purchases(player_id);
CREATE INDEX IF NOT EXISTS idx_vip_purchases_product ON vip_purchases(product_id);

-- Add to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime SET TABLE
  players, tables, buyin_requests, buyout_requests, financial_transactions,
  credit_requests, fnb_orders, staff, push_notifications, notification_read_status,
  chat_sessions, chat_messages, tournaments, tournament_players,
  player_profile_change_requests, waitlist_entries, leave_applications,
  staff_offers, audit_logs, player_feedback, vip_purchases;
