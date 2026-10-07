-- Sackverein's Bomb awards one scorer point in every season. Matches keep
-- their move counts and read these rules when points and Elo are recomputed.

-- +goose Up
UPDATE rule_moves rm
SET points_for_scorer = 1
FROM seasons s
WHERE s.id = rm.season_id
  AND s.group_id = 'c60a9d60-b511-42e4-aa05-0c7f22ba67c4'
  AND rm.name = 'Bomb'
  AND rm.points_for_scorer = 2;

-- +goose Down
-- Restore only the four original rules, leaving later seasons alone.
UPDATE rule_moves rm
SET points_for_scorer = 2
FROM seasons s
WHERE s.id = rm.season_id
  AND s.group_id = 'c60a9d60-b511-42e4-aa05-0c7f22ba67c4'
  AND rm.name = 'Bomb'
  AND rm.points_for_scorer = 1
  AND rm.id IN (
    '656b6a6d-347a-4238-a897-8a96a8a0faaf',
    '8a07c2a2-c3e5-421d-86a5-c391af99e22f',
    'ed173189-9482-4c54-8d6d-965875279c59',
    'acc772ce-0a1a-4748-bae5-b16b6f0d903d'
  );
