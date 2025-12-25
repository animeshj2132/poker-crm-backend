-- Create attendance_tracking table
-- Migration: 0036_create_attendance_tracking

CREATE TABLE IF NOT EXISTS attendance_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    login_time TIMESTAMP NOT NULL,
    logout_time TIMESTAMP,
    date DATE NOT NULL,
    total_hours DECIMAL(5, 2),
    status VARCHAR(20) DEFAULT 'active', -- active, completed, incomplete
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_tracking_club_id ON attendance_tracking(club_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tracking_staff_id ON attendance_tracking(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tracking_date ON attendance_tracking(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_tracking_staff_date ON attendance_tracking(staff_id, date DESC);

-- Comments
COMMENT ON TABLE attendance_tracking IS 'Employee login/logout time tracking for attendance management';
COMMENT ON COLUMN attendance_tracking.login_time IS 'When the employee logged in';
COMMENT ON COLUMN attendance_tracking.logout_time IS 'When the employee logged out (NULL if still logged in)';
COMMENT ON COLUMN attendance_tracking.total_hours IS 'Calculated total hours worked';
COMMENT ON COLUMN attendance_tracking.status IS 'Status: active (logged in), completed (logged out), incomplete (missing logout)';

