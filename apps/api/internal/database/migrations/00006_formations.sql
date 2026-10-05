-- Formations a group re-racks its cups into during a match (e.g. 6 cups into a
-- pyramid). The cups are points on the app's 7x7 cup grid.

-- +goose Up
CREATE TABLE formations (
    id text PRIMARY KEY,
    group_id text NOT NULL REFERENCES groups (id),
    name text NOT NULL,
    -- JSON list of {x, y}
    cups text NOT NULL,
    created_by text NOT NULL REFERENCES group_members (id),
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE INDEX formations_group_idx ON formations (group_id);

-- +goose Down
DROP TABLE formations;
