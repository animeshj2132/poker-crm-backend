-- Add credit management fields to players table
-- This allows super admin/club management to enable credit for specific players

-- Add credit_enabled flag (defaults to false - locked initially)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS credit_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add credit_limit (approved credit limit for this player)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add who enabled credit and when (audit trail)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS credit_enabled_by UUID REFERENCES public.users_v1(id) ON DELETE SET NULL;

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS credit_enabled_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.players.credit_enabled IS 'Whether credit feature is enabled for this player. Must be enabled by super admin/club management.';
COMMENT ON COLUMN public.players.credit_limit IS 'Maximum credit limit approved for this player';
COMMENT ON COLUMN public.players.credit_enabled_by IS 'User (admin/super admin) who enabled credit for this player';
COMMENT ON COLUMN public.players.credit_enabled_at IS 'Timestamp when credit was enabled';

-- Create index for querying players with credit enabled
CREATE INDEX IF NOT EXISTS idx_players_credit_enabled ON public.players(credit_enabled) WHERE credit_enabled = true;




