-- Enhanced FNB System Migration
-- This migration enhances the FNB system with all required features

-- 1. Update menu_items table to support 3 images and availability status
ALTER TABLE menu_items 
DROP COLUMN IF EXISTS image_url,
ADD COLUMN IF NOT EXISTS image_url_1 VARCHAR(2048),
ADD COLUMN IF NOT EXISTS image_url_2 VARCHAR(2048),
ADD COLUMN IF NOT EXISTS image_url_3 VARCHAR(2048),
DROP COLUMN IF EXISTS is_available,
ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'available' CHECK (availability IN ('available', 'limited', 'out_of_stock'));

-- 2. Add custom_category flag to menu_items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS is_custom_category BOOLEAN DEFAULT FALSE;

-- 3. Update suppliers table to support specializations
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS specializations JSONB DEFAULT '[]';

-- Set default specializations if needed (can be overridden)
COMMENT ON COLUMN suppliers.specializations IS 'Array of specializations: [meat_poultry, vegetables, spices, dairy, beverages, custom]';

-- 4. Create kitchen_stations table
CREATE TABLE IF NOT EXISTS kitchen_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_name VARCHAR(200) NOT NULL,
    station_number INT NOT NULL,
    chef_name VARCHAR(200),
    chef_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    orders_completed INT DEFAULT 0,
    orders_pending INT DEFAULT 0,
    club_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_kitchen_stations_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    CONSTRAINT fk_kitchen_stations_chef FOREIGN KEY (chef_id) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT unique_station_per_club UNIQUE (club_id, station_number)
);

CREATE INDEX IF NOT EXISTS idx_kitchen_stations_club ON kitchen_stations(club_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_stations_active ON kitchen_stations(is_active);
CREATE INDEX IF NOT EXISTS idx_kitchen_stations_chef ON kitchen_stations(chef_id);

-- 5. Update fnb_orders table to support kitchen stations and invoice
ALTER TABLE fnb_orders
ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS station_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_accepted BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMP,
DROP COLUMN IF EXISTS order_number;

-- Re-add order_number column (only for accepted and delivered orders)
ALTER TABLE fnb_orders
ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_fnb_orders_station ON fnb_orders(station_id);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_invoice ON fnb_orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_accepted ON fnb_orders(is_accepted);

-- 6. Add comment for order_number field
COMMENT ON COLUMN fnb_orders.order_number IS 'Order number assigned only after order is accepted. NULL for rejected/cancelled orders.';
COMMENT ON COLUMN fnb_orders.invoice_number IS 'Invoice number generated only after order is delivered.';

-- 7. Create default kitchen stations for existing clubs (optional)
-- This can be run manually or skipped
-- INSERT INTO kitchen_stations (station_name, station_number, club_id)
-- SELECT 'Station 1 - Quick Snacks', 1, id FROM clubs
-- ON CONFLICT (club_id, station_number) DO NOTHING;

-- 8. Create menu_categories table for managing categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    club_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_menu_categories_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    CONSTRAINT unique_category_per_club UNIQUE (club_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_club ON menu_categories(club_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_default ON menu_categories(is_default);

-- Insert default categories
INSERT INTO menu_categories (category_name, is_default, club_id)
SELECT 'Appetizers', TRUE, id FROM clubs
ON CONFLICT (club_id, category_name) DO NOTHING;

INSERT INTO menu_categories (category_name, is_default, club_id)
SELECT 'Main Course', TRUE, id FROM clubs
ON CONFLICT (club_id, category_name) DO NOTHING;

INSERT INTO menu_categories (category_name, is_default, club_id)
SELECT 'Beverages', TRUE, id FROM clubs
ON CONFLICT (club_id, category_name) DO NOTHING;

INSERT INTO menu_categories (category_name, is_default, club_id)
SELECT 'Desserts', TRUE, id FROM clubs
ON CONFLICT (club_id, category_name) DO NOTHING;

INSERT INTO menu_categories (category_name, is_default, club_id)
SELECT 'Snacks', TRUE, id FROM clubs
ON CONFLICT (club_id, category_name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced FNB system migration completed successfully!';
    RAISE NOTICE '  - Updated menu_items with 3 image support and availability status';
    RAISE NOTICE '  - Added kitchen_stations table';
    RAISE NOTICE '  - Updated suppliers with specializations';
    RAISE NOTICE '  - Enhanced fnb_orders with station and invoice support';
    RAISE NOTICE '  - Created menu_categories table with defaults';
END $$;

