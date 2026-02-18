-- Migration: Tournament rebuy/re-entry tracking
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS rebuy_count INTEGER DEFAULT 0;
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS addon_count INTEGER DEFAULT 0;
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS total_invested DECIMAL(12, 2) DEFAULT 0;
