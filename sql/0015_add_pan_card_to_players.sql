-- Add PAN card column to players table
-- PAN card must be unique per club (but can be same across different clubs)

-- Add pan_card column
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS pan_card VARCHAR(10) NULL;

-- Create unique index for pan_card per club (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_club_pan_card 
ON players(club_id, pan_card) 
WHERE pan_card IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN players.pan_card IS 'PAN card number (unique per club, format: ABCDE1234F)';

