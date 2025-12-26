-- Create rake_collections table
-- Migration: 0033_create_rake_collections

CREATE TABLE IF NOT EXISTS rake_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    session_date DATE NOT NULL,
    chip_denomination VARCHAR(500),
    total_rake_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    collected_by UUID REFERENCES users_v1(id) ON DELETE SET NULL,
    collected_by_name VARCHAR(200),
    collected_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rake_collections_club_id ON rake_collections(club_id);
CREATE INDEX IF NOT EXISTS idx_rake_collections_table_id ON rake_collections(table_id);
CREATE INDEX IF NOT EXISTS idx_rake_collections_session_date ON rake_collections(session_date);
CREATE INDEX IF NOT EXISTS idx_rake_collections_collected_at ON rake_collections(collected_at DESC);

-- Comments
COMMENT ON TABLE rake_collections IS 'Records of rake collected from poker tables by managers';
COMMENT ON COLUMN rake_collections.table_number IS 'Table number for quick reference';
COMMENT ON COLUMN rake_collections.session_date IS 'Date of the poker session';
COMMENT ON COLUMN rake_collections.chip_denomination IS 'Chip denominations used (e.g., ₹25, ₹50, ₹100, ₹500)';
COMMENT ON COLUMN rake_collections.total_rake_amount IS 'Total rake amount collected in INR';
COMMENT ON COLUMN rake_collections.collected_by IS 'User ID of the manager who collected the rake';


