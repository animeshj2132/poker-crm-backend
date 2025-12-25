-- Update tip_settings to support per-dealer settings
-- Migration: 0024_update_tip_settings_per_dealer

-- Drop the unique constraint on club_id
ALTER TABLE tip_settings DROP CONSTRAINT IF EXISTS tip_settings_club_id_key;

-- Add dealer_id column (nullable for club-wide defaults)
ALTER TABLE tip_settings ADD COLUMN IF NOT EXISTS dealer_id UUID;

-- Add foreign key constraint for dealer_id
ALTER TABLE tip_settings 
  ADD CONSTRAINT fk_tip_settings_dealer 
  FOREIGN KEY (dealer_id) 
  REFERENCES staff(id) ON DELETE CASCADE;

-- Create unique constraint on (club_id, dealer_id) combination
-- This allows one setting per dealer per club, and club-wide defaults (where dealer_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_settings_club_dealer 
  ON tip_settings(club_id, dealer_id) 
  WHERE dealer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_settings_club_default 
  ON tip_settings(club_id) 
  WHERE dealer_id IS NULL;

-- Update comment
COMMENT ON TABLE tip_settings IS 'Tip distribution settings - can be per-dealer or club-wide defaults';

-- Success message
SELECT '✅ Tip settings updated to support per-dealer configuration!' as message;

