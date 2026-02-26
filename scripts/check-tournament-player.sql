-- Check if player test1@test.com has joined any tournament
-- Run: psql $DATABASE_URL -f scripts/check-tournament-player.sql

\echo '=== Player(s) with email test1@test.com ==='
SELECT id, name, email, player_id, club_id
FROM players
WHERE LOWER(TRIM(email)) = 'test1@test.com';

\echo ''
\echo '=== Tournament REGISTRATIONS for that player (by email) ==='
SELECT tr.id, tr.tournament_id, tr.player_id, tr.club_id, tr.status, tr.registered_at,
       t.name AS tournament_name, t.status AS tournament_status
FROM tournament_registrations tr
JOIN players p ON p.id = tr.player_id
JOIN tournaments t ON t.id = tr.tournament_id
WHERE LOWER(TRIM(p.email)) = 'test1@test.com'
ORDER BY tr.registered_at DESC;

\echo ''
\echo '=== Tournament PLAYERS (active in tournament) for that player ==='
SELECT tp.tournament_id, tp.player_id, tp.is_active, tp.is_exited, tp.exited_at,
       tp.total_invested, tp.session_started_at, tp.exit_balance,
       t.name AS tournament_name, t.status AS tournament_status
FROM tournament_players tp
JOIN players p ON p.id = tp.player_id
JOIN tournaments t ON t.id = tp.tournament_id
WHERE LOWER(TRIM(p.email)) = 'test1@test.com'
ORDER BY tp.tournament_id;

\echo ''
\echo '=== Summary: has test1@test.com joined any tournament? ==='
SELECT
  (SELECT COUNT(*) FROM tournament_registrations tr JOIN players p ON p.id = tr.player_id WHERE LOWER(TRIM(p.email)) = 'test1@test.com') AS registration_count,
  (SELECT COUNT(*) FROM tournament_players tp JOIN players p ON p.id = tp.player_id WHERE LOWER(TRIM(p.email)) = 'test1@test.com') AS tournament_players_count;
