-- Create affiliate_transactions table for tracking affiliate payments
-- Migration: 0026_create_affiliate_transactions

-- Create affiliate_transactions table
CREATE TABLE IF NOT EXISTS affiliate_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'payment', -- payment, bonus, adjustment, commission
  description TEXT,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- completed, pending, cancelled
  processed_by UUID, -- User ID who processed the transaction
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_affiliate_transaction_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_transaction_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_affiliate 
  ON affiliate_transactions(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_club 
  ON affiliate_transactions(club_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_date 
  ON affiliate_transactions(processed_at);

CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_type 
  ON affiliate_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_status 
  ON affiliate_transactions(status);

-- Add comment
COMMENT ON TABLE affiliate_transactions IS 'Tracks all financial transactions for affiliates including payments, bonuses, and adjustments';

-- Success message
SELECT '✅ Affiliate transactions table created successfully!' as message;

