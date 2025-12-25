-- Create tournaments table
-- Migration: create-tournaments-table

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tournament_id VARCHAR(20) UNIQUE NOT NULL, -- e.g., T001, T002
  name VARCHAR(255) NOT NULL,
  tournament_type VARCHAR(100) NOT NULL,
  buy_in DECIMAL(10, 2) NOT NULL,
  entry_fee DECIMAL(10, 2) DEFAULT 0,
  starting_chips INTEGER NOT NULL,
  blind_structure VARCHAR(50) NOT NULL,
  number_of_levels INTEGER DEFAULT 15,
  minutes_per_level INTEGER DEFAULT 15,
  break_structure VARCHAR(50),
  break_duration INTEGER,
  late_registration INTEGER, -- in minutes
  payout_structure VARCHAR(50),
  seat_draw_method VARCHAR(50),
  clock_pause_rules VARCHAR(100),
  allow_rebuys BOOLEAN DEFAULT false,
  allow_addon BOOLEAN DEFAULT false,
  allow_reentry BOOLEAN DEFAULT false,
  bounty_amount DECIMAL(10, 2),
  max_players INTEGER DEFAULT 100,
  start_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tournament_players table (player registrations)
CREATE TABLE IF NOT EXISTS tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  seat_number INTEGER,
  table_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  busted_at TIMESTAMP,
  finishing_position INTEGER,
  prize_amount DECIMAL(10, 2),
  UNIQUE(tournament_id, player_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_club_id ON tournaments(club_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_time ON tournaments(start_time);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_player_id ON tournament_players(player_id);

-- Add comments
COMMENT ON TABLE tournaments IS 'Poker tournaments organized by clubs';
COMMENT ON TABLE tournament_players IS 'Players registered for tournaments and their results';
COMMENT ON COLUMN tournaments.status IS 'Tournament status: scheduled, active, completed, cancelled';
COMMENT ON COLUMN tournament_players.finishing_position IS 'Final position in tournament (1 = winner)';
COMMENT ON COLUMN tournament_players.prize_amount IS 'Prize money won by player';

