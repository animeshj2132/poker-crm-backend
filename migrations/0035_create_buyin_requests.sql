-- Create buyin_requests table
-- Migration: 0035_create_buyin_requests

CREATE TABLE IF NOT EXISTS buyin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    table_number INTEGER,
    seat_number INTEGER,
    requested_amount DECIMAL(10, 2) NOT NULL,
    current_table_balance DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_by UUID REFERENCES users_v1(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_buyin_requests_club_id ON buyin_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_buyin_requests_player_id ON buyin_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_buyin_requests_table_id ON buyin_requests(table_id);
CREATE INDEX IF NOT EXISTS idx_buyin_requests_status ON buyin_requests(status);
CREATE INDEX IF NOT EXISTS idx_buyin_requests_requested_at ON buyin_requests(requested_at DESC);

-- Comments
COMMENT ON TABLE buyin_requests IS 'Player buy-in requests from tables';
COMMENT ON COLUMN buyin_requests.status IS 'Request status: pending, approved, rejected';
COMMENT ON COLUMN buyin_requests.rejection_reason IS 'Reason for rejection if status is rejected';

