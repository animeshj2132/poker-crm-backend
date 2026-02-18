-- Add pause tracking columns to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0;
