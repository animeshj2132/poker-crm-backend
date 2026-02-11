-- Migration: 0044_add_affiliate_overrides_and_inventory_decimals.sql
-- Purpose:
-- 1) Add override tracking fields to affiliate_transactions (similar to financial_transactions)
-- 2) Allow decimal stock values in inventory_items (for FNB portal)

-- 1) Add override fields to affiliate_transactions
ALTER TABLE affiliate_transactions
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS overridden_by UUID,
  ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_overridden BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN affiliate_transactions.original_amount IS 'Original amount before override';
COMMENT ON COLUMN affiliate_transactions.override_reason IS 'Reason for transaction override';
COMMENT ON COLUMN affiliate_transactions.overridden_by IS 'User ID who performed the override';
COMMENT ON COLUMN affiliate_transactions.overridden_at IS 'Timestamp when override was performed';
COMMENT ON COLUMN affiliate_transactions.is_overridden IS 'Flag indicating if affiliate transaction was overridden';

-- 2) Allow decimal stock values in inventory_items
ALTER TABLE inventory_items
  ALTER COLUMN current_stock TYPE DECIMAL(10, 2) USING current_stock::DECIMAL(10, 2),
  ALTER COLUMN min_stock TYPE DECIMAL(10, 2) USING min_stock::DECIMAL(10, 2);

COMMENT ON COLUMN inventory_items.current_stock IS 'Current stock level (can be decimal, e.g. 2.5)';
COMMENT ON COLUMN inventory_items.min_stock IS 'Minimum stock threshold (can be decimal, e.g. 3.5)';

-- Success notice
DO $$
BEGIN
  RAISE NOTICE '✅ Added affiliate transaction override fields and decimal FNB inventory stock columns';
END $$;

