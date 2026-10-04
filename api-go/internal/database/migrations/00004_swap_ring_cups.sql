-- Ring of fire takes 6 cups and Ring of water 4; the first defaults had them
-- swapped. Rows still carrying the old defaults get the right count.

-- +goose Up
UPDATE rule_moves SET cups = CASE cups WHEN 4 THEN 6 ELSE 4 END
WHERE (name = 'Finish - Ring of fire' AND cups = 4) OR (name = 'Finish - Ring of water' AND cups = 6);

-- +goose Down
UPDATE rule_moves SET cups = CASE cups WHEN 6 THEN 4 ELSE 6 END
WHERE (name = 'Finish - Ring of fire' AND cups = 6) OR (name = 'Finish - Ring of water' AND cups = 4);
