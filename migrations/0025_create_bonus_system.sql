-- Bonus Management System
-- Migration: 0025_create_bonus_system

-- Create player_bonuses table
CREATE TABLE IF NOT EXISTS player_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  player_id UUID NOT NULL,
  bonus_type VARCHAR(100) NOT NULL, -- Predefined types or custom name
  bonus_amount DECIMAL(12, 2) NOT NULL,
  reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_player_bonus_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_bonus_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Create staff_bonuses table
CREATE TABLE IF NOT EXISTS staff_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  bonus_type VARCHAR(100) NOT NULL, -- Predefined types or custom name
  bonus_amount DECIMAL(12, 2) NOT NULL,
  reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_staff_bonus_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_bonus_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_bonuses_club ON player_bonuses(club_id);
CREATE INDEX IF NOT EXISTS idx_player_bonuses_player ON player_bonuses(player_id);
CREATE INDEX IF NOT EXISTS idx_player_bonuses_date ON player_bonuses(processed_at);
CREATE INDEX IF NOT EXISTS idx_player_bonuses_type ON player_bonuses(bonus_type);

CREATE INDEX IF NOT EXISTS idx_staff_bonuses_club ON staff_bonuses(club_id);
CREATE INDEX IF NOT EXISTS idx_staff_bonuses_staff ON staff_bonuses(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_bonuses_date ON staff_bonuses(processed_at);
CREATE INDEX IF NOT EXISTS idx_staff_bonuses_type ON staff_bonuses(bonus_type);

-- Add comments
COMMENT ON TABLE player_bonuses IS 'Player bonus records and processing history';
COMMENT ON TABLE staff_bonuses IS 'Staff bonus records and processing history';

-- Success message
SELECT '✅ Bonus management system created successfully!' as message;

