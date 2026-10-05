-- Hibernate never created indexes for foreign keys, so every lookup by
-- group, season, match or team scanned the whole table. These cover the
-- lookups the API does on every request. CONCURRENTLY keeps writes flowing
-- while they build.

-- +goose NO TRANSACTION
-- +goose Up
CREATE INDEX CONCURRENTLY IF NOT EXISTS group_members_user_group_idx ON group_members (user_id, group_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS groups_invite_code_idx ON groups (invite_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS seasons_group_idx ON seasons (group_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_group_name_idx ON profiles (group_id, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS players_season_idx ON players (season_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS players_profile_idx ON players (profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS matches_season_date_idx ON matches (season_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS teams_match_idx ON teams (match_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS team_members_team_idx ON team_members (team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS match_moves_team_member_idx ON match_moves (team_member_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS rule_moves_season_idx ON rule_moves (season_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS rules_season_idx ON rules (season_id);

-- +goose Down
DROP INDEX CONCURRENTLY IF EXISTS group_members_user_group_idx;
DROP INDEX CONCURRENTLY IF EXISTS groups_invite_code_idx;
DROP INDEX CONCURRENTLY IF EXISTS seasons_group_idx;
DROP INDEX CONCURRENTLY IF EXISTS profiles_group_name_idx;
DROP INDEX CONCURRENTLY IF EXISTS players_season_idx;
DROP INDEX CONCURRENTLY IF EXISTS players_profile_idx;
DROP INDEX CONCURRENTLY IF EXISTS matches_season_date_idx;
DROP INDEX CONCURRENTLY IF EXISTS teams_match_idx;
DROP INDEX CONCURRENTLY IF EXISTS team_members_team_idx;
DROP INDEX CONCURRENTLY IF EXISTS match_moves_team_member_idx;
DROP INDEX CONCURRENTLY IF EXISTS rule_moves_season_idx;
DROP INDEX CONCURRENTLY IF EXISTS rules_season_idx;
