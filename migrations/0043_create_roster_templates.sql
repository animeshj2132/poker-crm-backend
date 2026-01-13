-- Roster Template System
-- Migration: 0043_create_roster_templates
-- Purpose: Store staff roster preferences (weekly off days, default shift timings)
-- NOTE: All timestamps are stored in UTC but displayed in IST (Indian Standard Time, GMT+5:30)

-- Create roster_templates table
CREATE TABLE IF NOT EXISTS roster_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  staff_name VARCHAR(200) NOT NULL,
  staff_role VARCHAR(50) NOT NULL,
  
  -- Weekly off days (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  off_days JSONB NOT NULL DEFAULT '[]', -- e.g., [0, 6] for Sunday and Saturday off
  
  -- Default shift timings
  default_shift_start_time TIME NOT NULL DEFAULT '18:00:00', -- 6 PM
  default_shift_end_time TIME NOT NULL DEFAULT '02:00:00', -- 2 AM next day
  shift_crosses_midnight BOOLEAN DEFAULT true,
  
  -- Additional settings
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Audit fields
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_roster_templates_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_roster_templates_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT uk_roster_templates_staff UNIQUE (club_id, staff_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roster_templates_club_id ON roster_templates(club_id);
CREATE INDEX IF NOT EXISTS idx_roster_templates_staff_id ON roster_templates(staff_id);
CREATE INDEX IF NOT EXISTS idx_roster_templates_club_active ON roster_templates(club_id, is_active);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_roster_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_roster_templates_updated_at
BEFORE UPDATE ON roster_templates
FOR EACH ROW
EXECUTE FUNCTION update_roster_templates_updated_at();

-- Add comments
COMMENT ON TABLE roster_templates IS 'Roster templates for staff members (weekly off days and default shift timings)';
COMMENT ON COLUMN roster_templates.off_days IS 'Array of weekday numbers for weekly off days (0=Sun, 1=Mon, ..., 6=Sat)';
COMMENT ON COLUMN roster_templates.default_shift_start_time IS 'Default shift start time (TIME only, date calculated based on roster date)';
COMMENT ON COLUMN roster_templates.default_shift_end_time IS 'Default shift end time (TIME only)';
COMMENT ON COLUMN roster_templates.shift_crosses_midnight IS 'If true, shift ends on the next day';

-- Success message
SELECT '✅ Roster templates table created successfully!' as message;
