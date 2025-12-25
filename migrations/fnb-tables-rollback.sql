-- FNB Tables Rollback
-- Run this SQL to DROP all FNB tables (if needed)

DROP TABLE IF EXISTS fnb_orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ FNB tables dropped successfully!';
END $$;












