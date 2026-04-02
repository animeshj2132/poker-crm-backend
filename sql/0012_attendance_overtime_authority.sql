-- Run manually if TypeORM sync is off
ALTER TABLE attendance_tracking
  ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marked_by_tier INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marked_by_user_id UUID NULL,
  ADD COLUMN IF NOT EXISTS worked_roster_off_day BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_edit_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_edited_by_user_id UUID NULL;
