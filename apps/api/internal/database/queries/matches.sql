-- Lists are ordered by ctid, the physical row order. The Java backend sent
-- no ORDER BY, so its clients got rows in that order (e.g. the first team of
-- a match is "blue"); ordering explicitly keeps it stable across query plans.

-- name: InsertMatch :exec
INSERT INTO matches (id, date, season_id, created_by) VALUES ($1, $2, $3, $4);

-- name: GetMatch :one
SELECT * FROM matches WHERE id = $1;

-- name: MatchesBySeason :many
SELECT * FROM matches WHERE season_id = $1 ORDER BY ctid;

-- name: MatchesBySeasonSince :many
SELECT * FROM matches WHERE season_id = $1 AND date >= $2 ORDER BY ctid;

-- name: MatchExistsInSeason :one
SELECT EXISTS (SELECT 1 FROM matches WHERE id = $1 AND season_id = $2);

-- name: MatchCountsBySeason :many
SELECT m.season_id, count(*) AS matches FROM matches m
JOIN seasons s ON s.id = m.season_id
WHERE s.group_id = $1
GROUP BY m.season_id;

-- name: TeamsByMatchIDs :many
SELECT * FROM teams WHERE match_id = ANY (@match_ids::text[]) ORDER BY ctid;

-- name: TeamMembersByTeamIDs :many
SELECT * FROM team_members WHERE team_id = ANY (@team_ids::text[]) ORDER BY ctid;

-- name: MatchMovesByTeamMemberIDs :many
SELECT * FROM match_moves WHERE team_member_id = ANY (@team_member_ids::text[]) ORDER BY ctid;

-- name: InsertTeams :copyfrom
INSERT INTO teams (id, match_id, asset_id_photo) VALUES ($1, $2, $3);

-- name: InsertTeamMembers :copyfrom
INSERT INTO team_members (id, team_id, player_id) VALUES ($1, $2, $3);

-- name: InsertMatchMoves :copyfrom
INSERT INTO match_moves (id, value, team_member_id, move_id) VALUES ($1, $2, $3, $4);

-- name: GetTeam :one
SELECT * FROM teams WHERE id = $1;

-- name: TeamExistsInMatch :one
SELECT EXISTS (SELECT 1 FROM teams WHERE id = $1 AND match_id = $2);

-- name: CountTeams :one
SELECT count(id) FROM teams WHERE id = ANY (@ids::text[]);

-- name: SetTeamPhoto :one
UPDATE teams SET asset_id_photo = $2 WHERE id = $1
RETURNING *;

-- name: PhotoAssetIDsOfMatch :many
SELECT asset_id_photo::text FROM teams WHERE match_id = $1 AND asset_id_photo IS NOT NULL;

-- name: DeleteMatchMovesOfMatch :exec
DELETE FROM match_moves mm
USING team_members tm, teams t
WHERE mm.team_member_id = tm.id AND tm.team_id = t.id AND t.match_id = $1;

-- name: DeleteTeamMembersOfMatch :exec
DELETE FROM team_members tm
USING teams t
WHERE tm.team_id = t.id AND t.match_id = $1;

-- name: DeleteTeamsOfMatch :exec
DELETE FROM teams WHERE match_id = $1;

-- name: DeleteMatch :exec
DELETE FROM matches WHERE id = $1;
