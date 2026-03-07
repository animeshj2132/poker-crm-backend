-- Store the seat actually assigned by staff (may differ from requested_seat).
-- Hologram / live table view should show player at assigned seat, not requested.
ALTER TABLE waitlist_entries
ADD COLUMN IF NOT EXISTS assigned_seat INTEGER NULL;

COMMENT ON COLUMN waitlist_entries.assigned_seat IS 'Seat number assigned by staff; used for hologram. Falls back to requested_seat if null.';
