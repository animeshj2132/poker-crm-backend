-- Extend club_role enum to include all club roles
-- Note: PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction
-- This needs to be run manually or use DO block

DO $$
BEGIN
  -- Add new roles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MANAGER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'club_role')) THEN
    ALTER TYPE club_role ADD VALUE 'MANAGER';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'club_role')) THEN
    ALTER TYPE club_role ADD VALUE 'HR';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STAFF' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'club_role')) THEN
    ALTER TYPE club_role ADD VALUE 'STAFF';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AFFILIATE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'club_role')) THEN
    ALTER TYPE club_role ADD VALUE 'AFFILIATE';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CASHIER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'club_role')) THEN
    ALTER TYPE club_role ADD VALUE 'CASHIER';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GRE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'club_role')) THEN
    ALTER TYPE club_role ADD VALUE 'GRE';
  END IF;
END $$;

