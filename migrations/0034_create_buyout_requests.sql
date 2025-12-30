-- Create buyout_requests table
-- Migration: 0034_create_buyout_requests

CREATE TABLE IF NOT EXISTS buyout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    table_number INTEGER,
    seat_number INTEGER,
    requested_amount DECIMAL(10, 2),
    current_table_balance DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    call_time_started_at TIMESTAMP,
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_by UUID REFERENCES users_v1(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_buyout_requests_club_id ON buyout_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_buyout_requests_player_id ON buyout_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_buyout_requests_table_id ON buyout_requests(table_id);
CREATE INDEX IF NOT EXISTS idx_buyout_requests_status ON buyout_requests(status);
CREATE INDEX IF NOT EXISTS idx_buyout_requests_requested_at ON buyout_requests(requested_at DESC);

-- Comments
COMMENT ON TABLE buyout_requests IS 'Player buy-out requests from tables during call time';
COMMENT ON COLUMN buyout_requests.status IS 'Request status: pending, approved, rejected';
COMMENT ON COLUMN buyout_requests.call_time_started_at IS 'When the player started call time';
COMMENT ON COLUMN buyout_requests.rejection_reason IS 'Reason for rejection if status is rejected';







