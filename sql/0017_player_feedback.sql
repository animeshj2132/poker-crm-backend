-- Player Feedback Table
-- Stores feedback submissions from players

CREATE TABLE IF NOT EXISTS player_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  club_id UUID NOT NULL,
  message TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  CONSTRAINT fk_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_player_feedback_player_id ON player_feedback(player_id);
CREATE INDEX IF NOT EXISTS idx_player_feedback_club_id ON player_feedback(club_id);
CREATE INDEX IF NOT EXISTS idx_player_feedback_created_at ON player_feedback(created_at DESC);






