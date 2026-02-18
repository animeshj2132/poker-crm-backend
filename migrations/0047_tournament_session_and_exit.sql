-- Migration: Tournament session tracking and player exit system

-- Add session_started_at to tournaments for session timer
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE;

-- Add exit tracking fields to tournament_players
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS exited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS exit_balance DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS is_exited BOOLEAN DEFAULT false;
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE;

-- Index for quick lookup of active/exited players
CREATE INDEX IF NOT EXISTS idx_tournament_players_exited ON tournament_players(tournament_id, is_exited);
