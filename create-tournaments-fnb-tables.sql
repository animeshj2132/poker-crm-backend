-- Create Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    buy_in DECIMAL(10, 2) NOT NULL DEFAULT 0,
    prize_pool DECIMAL(10, 2) NOT NULL DEFAULT 0,
    max_players INT NOT NULL DEFAULT 100,
    current_players INT NOT NULL DEFAULT 0,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
    structure JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_club ON tournaments(club_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_time ON tournaments(start_time);

-- Create FNB Menu Table
CREATE TABLE IF NOT EXISTS fnb_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(2048),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fnb_menu_club ON fnb_menu(club_id);
CREATE INDEX IF NOT EXISTS idx_fnb_menu_category ON fnb_menu(category);
CREATE INDEX IF NOT EXISTS idx_fnb_menu_available ON fnb_menu(is_available);

-- Success message
SELECT '✅ Tournaments and FNB Menu tables created successfully!' as message;
