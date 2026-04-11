-- Fix menu_items table: add missing columns that TypeORM entity expects
-- The old fnb-tables.sql created is_available (boolean) + image_url (single)
-- The entity now uses availability (varchar enum) + image_url_1/2/3 + is_custom_category

-- Add availability column (varchar enum replaces is_available boolean)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS availability VARCHAR(20) NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS is_custom_category BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image_url_1 VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS image_url_2 VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS image_url_3 VARCHAR(2048);

-- Migrate is_available → availability if the old column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'is_available'
  ) THEN
    UPDATE menu_items SET availability = CASE WHEN is_available THEN 'available' ELSE 'out_of_stock' END
      WHERE availability = 'available' AND is_available = FALSE;
  END IF;
END $$;

-- Migrate image_url → image_url_1 if old column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'image_url'
  ) THEN
    UPDATE menu_items SET image_url_1 = image_url WHERE image_url_1 IS NULL AND image_url IS NOT NULL;
  END IF;
END $$;

-- Fix tables table: add missing Rummy-specific columns that TypeORM entity expects
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS rummy_variant    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS points_value     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS number_of_deals  INTEGER,
  ADD COLUMN IF NOT EXISTS drop_points      INTEGER,
  ADD COLUMN IF NOT EXISTS max_points       INTEGER,
  ADD COLUMN IF NOT EXISTS deal_duration    INTEGER,
  ADD COLUMN IF NOT EXISTS entry_fee        DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS min_players      INTEGER;

-- Drop notify_fcm trigger from tables that don't have player_id (it crashes on INSERT)
DO $$
DECLARE
  trig RECORD;
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tables', 'tournaments', 'menu_items', 'inventory_items', 'suppliers'] LOOP
    FOR trig IN
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = tbl
    LOOP
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.trigger_name) || ' ON ' || quote_ident(tbl);
    END LOOP;
  END LOOP;
END $$;

-- Ensure unique constraint on (club_id, table_number) exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'tables'::regclass AND contype = 'u'
      AND conname LIKE '%club_id%table_number%' OR conname = 'tables_club_id_table_number_key'
  ) THEN
    ALTER TABLE tables ADD CONSTRAINT tables_club_id_table_number_key UNIQUE (club_id, table_number);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Fix menu_items unique constraint to be per-club (if global unique on name exists, drop it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'menu_items'::regclass AND contype = 'u' AND conname = 'menu_items_name_key'
  ) THEN
    ALTER TABLE menu_items DROP CONSTRAINT menu_items_name_key;
  END IF;
END $$;

-- Ensure per-club unique index on menu item name
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_name_club ON menu_items(club_id, name);

-- financial_transactions: add game_type if missing (used by tournament buy-in/refund inserts)
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS game_type VARCHAR(50);

-- tournaments table: ensure it exists with all columns needed by the service
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  buy_in DECIMAL(10,2) NOT NULL DEFAULT 0,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_players INTEGER NOT NULL DEFAULT 100,
  start_time TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  structure JSONB,
  rummy_variant VARCHAR(100),
  number_of_deals INTEGER,
  points_per_deal DECIMAL(10,2),
  drop_points INTEGER,
  max_points INTEGER,
  deal_duration INTEGER,
  min_players INTEGER,
  session_started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  total_paused_seconds INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to tournaments if it already exists
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS rummy_variant     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS number_of_deals   INTEGER,
  ADD COLUMN IF NOT EXISTS points_per_deal   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS drop_points       INTEGER,
  ADD COLUMN IF NOT EXISTS max_points        INTEGER,
  ADD COLUMN IF NOT EXISTS deal_duration     INTEGER,
  ADD COLUMN IF NOT EXISTS min_players       INTEGER,
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_round     INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS structure         JSONB;

DO $$ BEGIN RAISE NOTICE '✅ 0032 migration complete'; END $$;
