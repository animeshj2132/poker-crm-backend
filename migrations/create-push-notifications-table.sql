-- Create push_notifications table
-- Migration: create-push-notifications-table

CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  details TEXT,
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  target_type VARCHAR(50) DEFAULT 'all_players',
  custom_player_ids JSONB,
  notification_type VARCHAR(20) DEFAULT 'player',
  is_active BOOLEAN DEFAULT true,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_notifications_club_id ON push_notifications(club_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_notification_type ON push_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_push_notifications_is_active ON push_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_push_notifications_scheduled_at ON push_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_push_notifications_target_type ON push_notifications(target_type);

-- Add comments
COMMENT ON TABLE push_notifications IS 'Push notifications and offers sent to players and staff';
COMMENT ON COLUMN push_notifications.target_type IS 'Target audience: all_players, new_signups, vip_players, tables_players, waitlist_players, custom_group, all_staff';
COMMENT ON COLUMN push_notifications.notification_type IS 'Type: player or staff';
COMMENT ON COLUMN push_notifications.custom_player_ids IS 'Array of player IDs for custom_group target type';

