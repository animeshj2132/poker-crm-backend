-- Enhance staff table with additional fields for comprehensive management
-- Migration: 0021_enhance_staff_table

-- Add new columns to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS temp_password BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS aadhar_document_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pan_document_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS affiliate_code VARCHAR(20) UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS custom_role_name VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS suspended_by UUID;

-- Create unique indexes for email and phone per club
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_email_club ON staff(email, club_id) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_phone_club ON staff(phone, club_id) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_affiliate_code ON staff(affiliate_code) WHERE affiliate_code IS NOT NULL;

-- Add comments
COMMENT ON COLUMN staff.email IS 'Unique email address for staff member';
COMMENT ON COLUMN staff.phone IS 'Unique phone number for staff member';
COMMENT ON COLUMN staff.password_hash IS 'Hashed password for authentication';
COMMENT ON COLUMN staff.temp_password IS 'Flag indicating if password needs to be reset';
COMMENT ON COLUMN staff.aadhar_document_url IS 'URL to uploaded Aadhar card document';
COMMENT ON COLUMN staff.pan_document_url IS 'URL to uploaded PAN card document';
COMMENT ON COLUMN staff.affiliate_code IS 'Unique code for affiliate staff members';
COMMENT ON COLUMN staff.custom_role_name IS 'Custom role name when role is STAFF';
COMMENT ON COLUMN staff.suspended_reason IS 'Reason for suspension if status is SUSPENDED';

-- Success message
SELECT '✅ Staff table enhanced successfully!' as message;

