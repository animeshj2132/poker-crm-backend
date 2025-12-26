-- Add archive fields to chat_sessions table for one-sided deletion
-- Migration: 0040_add_chat_archive_fields.sql
-- Description: Adds archived_by_initiator and archived_by_recipient fields to support one-sided chat deletion

-- Add archive columns
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS archived_by_initiator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_by_recipient BOOLEAN DEFAULT FALSE;

-- Add indexes for better query performance when filtering archived sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived_initiator 
ON chat_sessions(archived_by_initiator) 
WHERE archived_by_initiator = true;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived_recipient 
ON chat_sessions(archived_by_recipient) 
WHERE archived_by_recipient = true;

-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.archived_by_initiator IS 'True if the initiator has archived/deleted this chat from their side';
COMMENT ON COLUMN chat_sessions.archived_by_recipient IS 'True if the recipient has archived/deleted this chat from their side';

