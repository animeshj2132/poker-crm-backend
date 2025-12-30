-- Remove default value from kyc_status column
-- This allows us to explicitly control the value in code
-- Staff-created players: 'approved'
-- Self-signup players: 'pending'

ALTER TABLE players 
ALTER COLUMN kyc_status DROP DEFAULT;

-- Update any existing NULL values to 'pending' (safety measure)
UPDATE players 
SET kyc_status = 'pending' 
WHERE kyc_status IS NULL;

