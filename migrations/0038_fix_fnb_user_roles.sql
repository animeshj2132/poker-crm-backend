-- Migration to fix FNB staff members who may have missing user_club_roles entries
-- This ensures all FNB staff members have the correct ClubRole.FNB assigned

-- First, update any existing "Kitchen Staff" roles to "FNB" in the staff table (if not already done)
UPDATE staff 
SET role = 'FNB' 
WHERE role = 'Kitchen Staff';

-- Then, for all FNB staff members, ensure they have user_club_roles entries
-- This query will help identify staff members who need role assignments
-- Note: This is a data fix query - you may need to run this manually or create a script

-- Find FNB staff without user_club_roles entries:
-- SELECT s.id, s.email, s.name, s.club_id, u.id as user_id
-- FROM staff s
-- LEFT JOIN users_v1 u ON u.email = s.email
-- LEFT JOIN user_club_roles ucr ON ucr.user_id = u.id AND ucr.club_id = s.club_id AND ucr.role = 'FNB'
-- WHERE s.role = 'FNB' AND ucr.id IS NULL AND u.id IS NOT NULL;

-- To fix manually, you would need to:
-- 1. Find the user_id from users_v1 table for each FNB staff email
-- 2. Insert into user_club_roles: (user_id, club_id, role = 'FNB')

-- Example fix for a specific staff member (replace with actual IDs):
-- INSERT INTO user_club_roles (user_id, club_id, role, created_at, updated_at)
-- SELECT u.id, s.club_id, 'FNB', NOW(), NOW()
-- FROM staff s
-- JOIN users_v1 u ON u.email = s.email
-- WHERE s.role = 'FNB' 
--   AND s.email = 'fnb@fnb.com'  -- Replace with actual email
--   AND NOT EXISTS (
--     SELECT 1 FROM user_club_roles ucr 
--     WHERE ucr.user_id = u.id 
--       AND ucr.club_id = s.club_id 
--       AND ucr.role = 'FNB'
--   );







