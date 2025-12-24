-- Master Admin Features Migration
-- Adds status, terms, subscription fields to clubs and tenants

-- Add status column to clubs (active, suspended, killed)
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'killed'));

-- Add terms and conditions to clubs
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Add subscription tracking to clubs
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS subscription_price DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'paused', 'cancelled'));

ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

-- Add subscription notes/tracking
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS subscription_notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);
CREATE INDEX IF NOT EXISTS idx_clubs_subscription_status ON clubs(subscription_status);
CREATE INDEX IF NOT EXISTS idx_clubs_tenant_id ON clubs(tenant_id);

-- Add email column to tenants if not exists (for super admin)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);

COMMENT ON COLUMN clubs.status IS 'Club operational status: active (normal operations), suspended (temporarily disabled), killed (permanently disabled)';
COMMENT ON COLUMN clubs.terms_and_conditions IS 'Club-specific terms and conditions shown to players';
COMMENT ON COLUMN clubs.subscription_price IS 'Monthly subscription price for this club';
COMMENT ON COLUMN clubs.subscription_status IS 'Subscription payment status';

