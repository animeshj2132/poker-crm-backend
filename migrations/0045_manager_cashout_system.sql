c-- Migration: Add manager tip cashout system
-- 1. Add manager_id to dealer_tips to track which manager gets the floor share
-- 2. Create manager_cashouts table for cashing out manager tip balances

-- Add manager_id column to dealer_tips
ALTER TABLE dealer_tips ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES staff(id);

-- Create manager_cashouts table
CREATE TABLE IF NOT EXISTS manager_cashouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  manager_id UUID NOT NULL REFERENCES staff(id),
  cashout_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  game_type VARCHAR(50),
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dealer_tips_manager_id ON dealer_tips(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_cashouts_club_id ON manager_cashouts(club_id);
CREATE INDEX IF NOT EXISTS idx_manager_cashouts_manager_id ON manager_cashouts(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_cashouts_cashout_date ON manager_cashouts(cashout_date);
