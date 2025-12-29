-- Migration to add user_id column to staff table
-- This links staff members to users_v1 table for authentication

-- Add user_id column to staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS user_id UUID NULL;

-- Add foreign key constraint to users_v1 table
ALTER TABLE staff
ADD CONSTRAINT fk_staff_user
FOREIGN KEY (user_id) REFERENCES users_v1(id)
ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);

-- Update existing staff records to link to users_v1 if matching emails exist
UPDATE staff s
SET user_id = u.id
FROM users_v1 u
WHERE s.email IS NOT NULL 
  AND u.email = s.email
  AND s.user_id IS NULL;



