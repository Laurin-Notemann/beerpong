-- name: TournamentsByGroup :many
SELECT * FROM tournaments WHERE group_id = $1 ORDER BY created_at DESC;

-- name: GetTournament :one
SELECT * FROM tournaments WHERE id = $1 AND group_id = $2;

-- name: LockTournament :one
SELECT * FROM tournaments WHERE id = $1 AND group_id = $2 FOR UPDATE;

-- name: TournamentForFixture :one
SELECT t.* FROM tournaments t
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(t.data->'stages') stage,
    jsonb_array_elements(stage->'matches') fixture WHERE fixture->>'id' = @fixture_id::text
);

-- name: InsertTournament :execrows
INSERT INTO tournaments (id, group_id, season_id, status, created_at, data)
VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;

-- name: SaveTournament :exec
UPDATE tournaments SET data = $2, status = $3 WHERE id = $1;

-- name: LinkLiveTournament :exec
UPDATE live_matches SET tournament_id = $2, tournament_stage = $3 WHERE id = $1;

-- name: LinkMatchTournament :exec
UPDATE matches SET tournament_id = $2, tournament_stage = $3 WHERE id = $1;

-- name: ActiveTournamentExists :one
SELECT EXISTS (SELECT 1 FROM tournaments WHERE group_id = $1 AND status = 'ACTIVE');

-- name: LockTournamentGroup :one
SELECT * FROM groups WHERE id = $1 FOR UPDATE;
