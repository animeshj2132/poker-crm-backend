-- Optional: promotions/offers auto-hide from players after this instant (server-side filter on active offers).
ALTER TABLE push_notifications
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_push_notifications_expires_at ON push_notifications(expires_at);

COMMENT ON COLUMN push_notifications.expires_at IS 'When set and in the past, offer is excluded from player active offers list';
