-- Add club code field (6 digits, unique)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS code VARCHAR(6) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_clubs_code ON public.clubs(code);

-- Generate codes for existing clubs (if any)
DO $$
DECLARE
  club_record RECORD;
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  FOR club_record IN SELECT id FROM public.clubs WHERE code IS NULL
  LOOP
    -- Generate a unique 6-digit code
    LOOP
      new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      SELECT EXISTS(SELECT 1 FROM public.clubs WHERE code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    UPDATE public.clubs SET code = new_code WHERE id = club_record.id;
  END LOOP;
END $$;

-- Add password hash to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_club_email ON public.players(club_id, email);


