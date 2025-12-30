-- Add KYC status field to players table
-- This ensures all players must complete KYC before using the platform

-- Add kyc_status column with default 'pending'
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending';

-- Add kyc_approved_at timestamp
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMP;

-- Add kyc_approved_by (staff/admin who approved)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS kyc_approved_by UUID REFERENCES users(id);

-- Add kyc_documents JSONB to store document URLs/info
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS kyc_documents JSONB;

-- Add comments
COMMENT ON COLUMN public.players.kyc_status IS 'KYC verification status: pending, approved, rejected, verified';
COMMENT ON COLUMN public.players.kyc_approved_at IS 'Timestamp when KYC was approved';
COMMENT ON COLUMN public.players.kyc_approved_by IS 'User ID who approved the KYC';
COMMENT ON COLUMN public.players.kyc_documents IS 'JSON object storing KYC document URLs and metadata';

-- Update existing players to 'pending' status
UPDATE public.players 
SET kyc_status = 'pending' 
WHERE kyc_status IS NULL;

-- Create index for faster KYC status queries
CREATE INDEX IF NOT EXISTS idx_players_kyc_status ON public.players(kyc_status);

-- Display updated players
SELECT 
  id, 
  name, 
  email, 
  kyc_status, 
  status,
  created_at 
FROM public.players 
ORDER BY created_at DESC 
LIMIT 5;













