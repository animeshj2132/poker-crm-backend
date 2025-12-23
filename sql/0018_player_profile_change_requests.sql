-- Player Profile Change Requests
-- Stores per-field profile change requests from players for staff review

CREATE TABLE IF NOT EXISTS player_profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  club_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  current_value TEXT,
  requested_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID,
  review_notes TEXT,
  CONSTRAINT fk_profile_change_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_change_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_change_player_id ON player_profile_change_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_club_id ON player_profile_change_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_status ON player_profile_change_requests(status);


