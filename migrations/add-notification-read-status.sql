-- Migration: Add notification read status tracking
-- Date: 2025-12-26
-- Description: Creates notification_read_status table and adds custom_staff_ids to push_notifications

-- Create notification_read_status table
CREATE TABLE IF NOT EXISTS notification_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('player', 'staff')),
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_notification_recipient UNIQUE(notification_id, recipient_id, recipient_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_read_status_recipient 
  ON notification_read_status(club_id, recipient_id, recipient_type);

CREATE INDEX IF NOT EXISTS idx_notification_read_status_unread 
  ON notification_read_status(club_id, recipient_id, recipient_type, is_read) 
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notification_read_status_notification 
  ON notification_read_status(notification_id);

-- Add custom_staff_ids column to push_notifications
ALTER TABLE push_notifications 
  ADD COLUMN IF NOT EXISTS custom_staff_ids JSONB;

-- Add comment
COMMENT ON TABLE notification_read_status IS 'Tracks read/unread status of notifications for each recipient';
COMMENT ON COLUMN notification_read_status.recipient_type IS 'Type of recipient: player or staff';
COMMENT ON COLUMN notification_read_status.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN notification_read_status.read_at IS 'Timestamp when notification was marked as read';
COMMENT ON COLUMN push_notifications.custom_staff_ids IS 'Array of staff IDs for custom staff group targeting';

