-- Payroll Management System
-- Migration: 0023_create_payroll_system

-- Create salary_payments table
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  pay_period VARCHAR(20) NOT NULL, -- 'Weekly', 'Bi-weekly', 'Monthly'
  base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(8, 2) DEFAULT 0,
  overtime_amount DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  gross_amount DECIMAL(12, 2) NOT NULL,
  net_amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Processed', -- 'Processed', 'Paid', 'Cancelled'
  notes TEXT,
  processed_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_salary_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create dealer_tips table
CREATE TABLE IF NOT EXISTS dealer_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  dealer_id UUID NOT NULL,
  tip_date DATE NOT NULL,
  total_tips DECIMAL(12, 2) NOT NULL DEFAULT 0,
  club_hold_percentage DECIMAL(5, 2) DEFAULT 15,
  club_hold_amount DECIMAL(12, 2) DEFAULT 0,
  dealer_share_percentage DECIMAL(5, 2) DEFAULT 85,
  dealer_share_amount DECIMAL(12, 2) DEFAULT 0,
  floor_manager_percentage DECIMAL(5, 2) DEFAULT 5,
  floor_manager_amount DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Processed', 'Paid'
  notes TEXT,
  processed_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_tips_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_tips_dealer FOREIGN KEY (dealer_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create dealer_cashouts table
CREATE TABLE IF NOT EXISTS dealer_cashouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  dealer_id UUID NOT NULL,
  cashout_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  processed_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_cashout_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_cashout_dealer FOREIGN KEY (dealer_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create tip_settings table (for club-wide tip distribution settings)
CREATE TABLE IF NOT EXISTS tip_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL UNIQUE,
  club_hold_percentage DECIMAL(5, 2) DEFAULT 15,
  dealer_share_percentage DECIMAL(5, 2) DEFAULT 85,
  floor_manager_percentage DECIMAL(5, 2) DEFAULT 5,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  CONSTRAINT fk_tip_settings_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salary_payments_club ON salary_payments(club_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_staff ON salary_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(period_start_date, period_end_date);

CREATE INDEX IF NOT EXISTS idx_dealer_tips_club ON dealer_tips(club_id);
CREATE INDEX IF NOT EXISTS idx_dealer_tips_dealer ON dealer_tips(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_tips_date ON dealer_tips(tip_date);
CREATE INDEX IF NOT EXISTS idx_dealer_tips_status ON dealer_tips(status);

CREATE INDEX IF NOT EXISTS idx_dealer_cashouts_club ON dealer_cashouts(club_id);
CREATE INDEX IF NOT EXISTS idx_dealer_cashouts_dealer ON dealer_cashouts(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_cashouts_date ON dealer_cashouts(cashout_date);

-- Add comments
COMMENT ON TABLE salary_payments IS 'Employee salary payments and processing records';
COMMENT ON TABLE dealer_tips IS 'Dealer tips tracking and distribution';
COMMENT ON TABLE dealer_cashouts IS 'Dealer chip cash-out records';
COMMENT ON TABLE tip_settings IS 'Club-wide tip distribution settings';

-- Success message
SELECT '✅ Payroll management system created successfully!' as message;

