-- Add rejection_reason column to credit_requests so players can see why their request was denied
ALTER TABLE credit_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
