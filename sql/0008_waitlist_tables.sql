-- Waitlist & Seating Tables

-- Waitlist entries
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_id TEXT,
  phone_number TEXT,
  email TEXT,
  party_size INTEGER NOT NULL DEFAULT 1,
  status VARCHAR NOT NULL DEFAULT 'PENDING',
  table_number INTEGER,
  table_type TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  seated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  seated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX waitlist_entries_club_id_idx ON waitlist_entries(club_id);
CREATE INDEX waitlist_entries_status_idx ON waitlist_entries(status);
CREATE INDEX waitlist_entries_created_at_idx ON waitlist_entries(created_at);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  table_type VARCHAR NOT NULL,
  max_seats INTEGER NOT NULL,
  current_seats INTEGER NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'AVAILABLE',
  min_buy_in DECIMAL(10, 2),
  max_buy_in DECIMAL(10, 2),
  notes TEXT,
  reserved_for TEXT,
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, table_number)
);

CREATE INDEX tables_club_id_idx ON tables(club_id);
CREATE INDEX tables_status_idx ON tables(status);
CREATE INDEX tables_table_type_idx ON tables(table_type);

