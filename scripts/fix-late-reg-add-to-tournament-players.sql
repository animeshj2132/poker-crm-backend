-- One-off fix: add test1@test.com (and any other late registrants) into tournament_players
-- so they appear in admin and exit-player works. Run after check-tournament-player.sql.

-- Add missing tournament_players rows for anyone in tournament_registrations
-- for an ACTIVE tournament but not yet in tournament_players
INSERT INTO tournament_players (
  tournament_id,
  player_id,
  is_active,
  session_started_at,
  is_exited,
  total_invested
)
SELECT
  tr.tournament_id,
  tr.player_id,
  true,
  COALESCE(t.session_started_at, NOW()),
  false,
  COALESCE(t.buy_in, 0)
FROM tournament_registrations tr
JOIN tournaments t ON t.id = tr.tournament_id
WHERE tr.status = 'registered'
  AND t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM tournament_players tp
    WHERE tp.tournament_id = tr.tournament_id AND tp.player_id = tr.player_id
  )
ON CONFLICT (tournament_id, player_id) DO UPDATE SET
  is_active = true,
  is_exited = false,
  session_started_at = COALESCE(tournament_players.session_started_at, EXCLUDED.session_started_at),
  total_invested = GREATEST(COALESCE(tournament_players.total_invested, 0), EXCLUDED.total_invested);
