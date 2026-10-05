-- Sackverein's "Andre": a duplicate of "André" that never played and was
-- removed from its only season in the app. Removing a player only takes it out
-- of the season, so the profile stayed. Each delete keeps the row if anything
-- still uses it.

-- +goose Up
DELETE FROM players p
WHERE p.id = '28f5db58-a1e9-45c9-b89e-f54f965581e8'
  AND NOT p.active_this_season
  AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.player_id = p.id);

DELETE FROM statistics s
WHERE s.id = 'b02ed32f-81ad-4978-adfb-df8932c5d6c7'
  AND NOT EXISTS (SELECT 1 FROM players p WHERE p.statistics_id = s.id);

DELETE FROM profiles pr
WHERE pr.id = '4059a276-9ecf-44de-a0f3-735305fb248c'
  AND NOT EXISTS (SELECT 1 FROM players p WHERE p.profile_id = pr.id);

-- +goose Down
-- The rows are gone; nothing to restore.
SELECT 1;
