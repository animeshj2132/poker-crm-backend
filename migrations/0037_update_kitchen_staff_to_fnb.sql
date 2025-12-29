-- Migration to update existing "Kitchen Staff" role to "FNB"
-- This ensures existing staff members with "Kitchen Staff" role are updated to "FNB"

UPDATE staff 
SET role = 'FNB' 
WHERE role = 'Kitchen Staff';

-- Also update any user_club_roles that might have been created with the old mapping
-- Note: This assumes the mapping was already correct in the service, but we're ensuring consistency






