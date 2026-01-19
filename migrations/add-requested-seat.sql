-- Add requested_seat column to waitlist_entries
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS requested_seat INT NULL;

-- Add comment
COMMENT ON COLUMN waitlist_entries.requested_seat IS 'The specific seat number (1-8) that the player requested when joining the waitlist';
