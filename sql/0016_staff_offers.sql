-- Staff Offers Table Migration
-- Promotional offers created by club staff for players

CREATE TABLE IF NOT EXISTS staff_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    offer_type VARCHAR(50) NOT NULL,
    value VARCHAR(100),
    validity_start TIMESTAMP NOT NULL,
    validity_end TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    terms TEXT,
    image_url VARCHAR(2048),
    target_audience VARCHAR(50) DEFAULT 'all',
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_staff_offers_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_offers_club ON staff_offers(club_id);
CREATE INDEX IF NOT EXISTS idx_staff_offers_active ON staff_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_offers_validity ON staff_offers(validity_start, validity_end);

-- Add check constraints
ALTER TABLE staff_offers ADD CONSTRAINT check_staff_offers_type 
    CHECK (offer_type IN ('deposit_bonus', 'cashback', 'freebie', 'tournament', 'loyalty', 'referral', 'seasonal', 'other'));

ALTER TABLE staff_offers ADD CONSTRAINT check_staff_offers_target 
    CHECK (target_audience IN ('all', 'new_players', 'vip', 'active', 'inactive'));

ALTER TABLE staff_offers ADD CONSTRAINT check_staff_offers_validity 
    CHECK (validity_end > validity_start);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Staff offers table created successfully!';
END $$;






