-- Add must_reset_password column to players table
-- This is used to force password reset on first login when player is created by admin

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT true;

-- Set existing players to false (they've already logged in)
UPDATE players 
SET must_reset_password = false 
WHERE must_reset_password IS NULL;

-- Add comment
COMMENT ON COLUMN players.must_reset_password IS 'Force password reset on first login (when created by admin with temp password)';


