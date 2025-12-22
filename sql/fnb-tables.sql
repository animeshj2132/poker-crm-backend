-- FNB Tables Migration
-- Run this SQL to create all FNB tables

-- 1. FNB Orders Table
CREATE TABLE IF NOT EXISTS fnb_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL,
    player_name VARCHAR(200) NOT NULL,
    player_id VARCHAR(100),
    table_number VARCHAR(50) NOT NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    special_instructions TEXT,
    processed_by VARCHAR(100),
    sent_to_chef BOOLEAN DEFAULT FALSE,
    chef_assigned VARCHAR(100),
    status_history JSONB,
    club_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_fnb_orders_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fnb_orders_club ON fnb_orders(club_id);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_status ON fnb_orders(status);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_created ON fnb_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_player ON fnb_orders(player_id);

-- 2. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    supplier VARCHAR(200),
    description TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(2048),
    club_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_menu_items_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_menu_items_club ON menu_items(club_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_name_club ON menu_items(club_id, name);

-- 3. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_stock INT NOT NULL,
    min_stock INT NOT NULL,
    supplier VARCHAR(200),
    last_restocked DATE,
    cost DECIMAL(10, 2),
    unit VARCHAR(50),
    club_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_inventory_items_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_club ON inventory_items(club_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(current_stock);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_name_club ON inventory_items(club_id, name);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    contact VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(200),
    rating DECIMAL(3, 1),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    club_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_suppliers_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_suppliers_club ON suppliers(club_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_club ON suppliers(club_id, name);

-- Add check constraints
ALTER TABLE fnb_orders ADD CONSTRAINT check_fnb_orders_status 
    CHECK (status IN ('pending', 'processing', 'ready', 'delivered', 'cancelled'));

ALTER TABLE fnb_orders ADD CONSTRAINT check_fnb_orders_total_positive 
    CHECK (total_amount >= 0);

ALTER TABLE menu_items ADD CONSTRAINT check_menu_items_price_positive 
    CHECK (price >= 0);

ALTER TABLE menu_items ADD CONSTRAINT check_menu_items_stock_positive 
    CHECK (stock >= 0);

ALTER TABLE inventory_items ADD CONSTRAINT check_inventory_current_stock_positive 
    CHECK (current_stock >= 0);

ALTER TABLE inventory_items ADD CONSTRAINT check_inventory_min_stock_positive 
    CHECK (min_stock >= 0);

ALTER TABLE suppliers ADD CONSTRAINT check_suppliers_rating_range 
    CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ FNB tables created successfully!';
    RAISE NOTICE '  - fnb_orders';
    RAISE NOTICE '  - menu_items';
    RAISE NOTICE '  - inventory_items';
    RAISE NOTICE '  - suppliers';
END $$;

