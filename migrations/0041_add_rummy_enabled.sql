-- Add rummy_enabled field to clubs table
-- Migration: 0041_add_rummy_enabled.sql
-- Description: Adds rummy_enabled field to support rummy mode for clubs

-- Add rummy_enabled column
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS rummy_enabled BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clubs_rummy_enabled ON clubs(rummy_enabled) WHERE rummy_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN clubs.rummy_enabled IS 'When enabled, the club will show Rummy-specific features in staff and player portals';







