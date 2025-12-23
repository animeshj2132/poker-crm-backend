-- Affiliates table
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users_v1(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  total_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, code),
  UNIQUE(club_id, user_id)
);

-- Players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone_number VARCHAR(20),
  player_id VARCHAR(100),
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliates_club_id ON public.affiliates(club_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON public.affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_players_club_id ON public.players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_affiliate_id ON public.players(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_players_email ON public.players(email);
CREATE INDEX IF NOT EXISTS idx_players_status ON public.players(status);





















