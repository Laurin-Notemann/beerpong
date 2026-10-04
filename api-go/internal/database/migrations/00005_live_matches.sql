-- Live matches: a server-sequenced, append-only log of ops that every phone at
-- the table appends to. Finishing one turns it into a regular match.

-- +goose Up
CREATE TABLE live_matches (
    id text PRIMARY KEY,
    group_id text NOT NULL REFERENCES groups (id),
    season_id text NOT NULL REFERENCES seasons (id),
    created_by text NOT NULL REFERENCES group_members (id),
    status text NOT NULL CHECK (status IN ('IN_PROGRESS', 'FINISHED', 'ABANDONED')),
    started_at timestamp(6) with time zone NOT NULL,
    last_activity_at timestamp(6) with time zone NOT NULL,
    ended_at timestamp(6) with time zone,
    last_seq bigint NOT NULL,
    result_match_id text REFERENCES matches (id) ON DELETE SET NULL
);

-- the group's list of running matches, newest activity first
CREATE INDEX live_matches_group_status_activity_idx ON live_matches (group_id, status, last_activity_at DESC);
-- the expiry scan only looks at running matches
CREATE INDEX live_matches_in_progress_activity_idx ON live_matches (last_activity_at) WHERE status = 'IN_PROGRESS';

CREATE TABLE live_match_ops (
    id text PRIMARY KEY,
    live_match_id text NOT NULL REFERENCES live_matches (id),
    seq bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    created_by text NOT NULL REFERENCES group_members (id),
    type text NOT NULL,
    -- JSON of the fields that belong to the op's type
    payload text NOT NULL,
    UNIQUE (live_match_id, seq)
);

-- +goose Down
DROP TABLE live_match_ops;
DROP TABLE live_matches;
