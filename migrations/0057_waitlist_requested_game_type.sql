-- Add requested_game_type to waitlist_entries so poker and rummy requests stay separate
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS requested_game_type VARCHAR(20) NULL;

COMMENT ON COLUMN waitlist_entries.requested_game_type IS 'Game requested: POKER or RUMMY. Ensures assign-seat only allows matching table type.';
