-- Shift Management System
-- Migration: 0022_create_shift_management

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  shift_date DATE NOT NULL,
  shift_start_time TIMESTAMP NOT NULL,
  shift_end_time TIMESTAMP NOT NULL,
  is_off_day BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT fk_shifts_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_shifts_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shifts_club_id ON shifts(club_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_club_staff_date ON shifts(club_id, staff_id, shift_date);

-- Add comments
COMMENT ON TABLE shifts IS 'Shift management for staff members (primarily dealers)';
COMMENT ON COLUMN shifts.shift_date IS 'Date the shift is associated with (for calendar view)';
COMMENT ON COLUMN shifts.shift_start_time IS 'Actual start timestamp (can be on shift_date or earlier)';
COMMENT ON COLUMN shifts.shift_end_time IS 'Actual end timestamp (can be on next day)';
COMMENT ON COLUMN shifts.is_off_day IS 'If true, this is a scheduled day off';
COMMENT ON COLUMN shifts.notes IS 'Additional notes about the shift';

-- Success message
SELECT '✅ Shift management table created successfully!' as message;

