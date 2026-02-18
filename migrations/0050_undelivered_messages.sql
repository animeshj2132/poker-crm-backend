-- Undelivered messages queue for guaranteed chat delivery
-- When WebSocket delivery fails, messages are stored here and flushed on reconnect
CREATE TABLE IF NOT EXISTS undelivered_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('player', 'staff')),
  recipient_id UUID NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_undelivered_recipient ON undelivered_messages (recipient_type, recipient_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_undelivered_cleanup ON undelivered_messages (delivered_at) WHERE delivered_at IS NOT NULL;
