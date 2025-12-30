-- Add FNB to club_role enum
-- This migration adds 'FNB' as a valid value to the club_role enum type

DO $$
BEGIN
  -- Add FNB role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'FNB' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'club_role')
  ) THEN
    ALTER TYPE club_role ADD VALUE 'FNB';
  END IF;
END $$;








