-- Add override fields to financial_transactions table
-- Migration: 0028_add_transaction_overrides

-- Add override tracking columns
ALTER TABLE financial_transactions 
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS overridden_by UUID,
  ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_overridden BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN financial_transactions.original_amount IS 'Original amount before override';
COMMENT ON COLUMN financial_transactions.override_reason IS 'Reason for transaction override';
COMMENT ON COLUMN financial_transactions.overridden_by IS 'User ID who performed the override';
COMMENT ON COLUMN financial_transactions.overridden_at IS 'Timestamp when override was performed';
COMMENT ON COLUMN financial_transactions.is_overridden IS 'Flag indicating if transaction was overridden';

-- Success message
SELECT '✅ Transaction override fields added successfully!' as message;

