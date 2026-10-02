-- The schema as Hibernate (ddl-auto=update) created it for the Java backend,
-- including Hibernate's constraint names. On an existing database every
-- statement is a no-op, so the Java and Go backends can share it.

-- +goose Up
CREATE TABLE IF NOT EXISTS users (
    id varchar(255) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS devices (
    id varchar(255) NOT NULL,
    device_id varchar(255),
    push_notification_token varchar(255),
    type smallint,
    user_id varchar(255),
    CONSTRAINT devices_pkey PRIMARY KEY (id),
    CONSTRAINT devices_type_check CHECK (type >= 0 AND type <= 1)
);

CREATE TABLE IF NOT EXISTS assets (
    id varchar(255) NOT NULL,
    offsetx double precision NOT NULL,
    offsety double precision NOT NULL,
    type smallint,
    zoom double precision NOT NULL,
    CONSTRAINT assets_pkey PRIMARY KEY (id),
    CONSTRAINT assets_type_check CHECK (type >= 0 AND type <= 2)
);

CREATE TABLE IF NOT EXISTS groups (
    id varchar(255) NOT NULL,
    created_at timestamp(6) with time zone,
    custom_sport_name varchar(255),
    invite_code varchar(255),
    name varchar(255),
    sport_preset varchar(255),
    active_season_id varchar(255),
    asset_id_wallpaper varchar(255),
    created_by varchar(255),
    CONSTRAINT groups_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS group_members (
    id varchar(255) NOT NULL,
    active boolean NOT NULL,
    group_id varchar(255),
    user_id varchar(255),
    CONSTRAINT group_members_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS season_settings (
    id varchar(255) NOT NULL,
    daily_leaderboard smallint,
    max_team_size integer NOT NULL,
    min_matches_to_qualify integer NOT NULL,
    min_team_size integer NOT NULL,
    ranking_algorithm smallint,
    wake_time time without time zone DEFAULT '00:00:00',
    CONSTRAINT season_settings_pkey PRIMARY KEY (id),
    CONSTRAINT season_settings_daily_leaderboard_check CHECK (daily_leaderboard >= 0 AND daily_leaderboard <= 2),
    CONSTRAINT season_settings_ranking_algorithm_check CHECK (ranking_algorithm >= 0 AND ranking_algorithm <= 1)
);

CREATE TABLE IF NOT EXISTS seasons (
    id varchar(255) NOT NULL,
    end_date timestamp(6) with time zone,
    group_id varchar(255),
    name varchar(255),
    start_date timestamp(6) with time zone,
    season_settings_id varchar(255),
    created_by varchar(255),
    CONSTRAINT seasons_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id varchar(255) NOT NULL,
    name varchar(255),
    asset_id_avatar varchar(255),
    group_id varchar(255),
    created_by varchar(255),
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS statistics (
    id varchar(255) NOT NULL,
    avg_points_per_match double precision NOT NULL,
    avg_team_size double precision NOT NULL,
    elo double precision NOT NULL,
    matches bigint NOT NULL,
    moves bigint NOT NULL,
    points bigint NOT NULL,
    total_team_size bigint NOT NULL,
    wins bigint DEFAULT 0,
    CONSTRAINT statistics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS players (
    id varchar(255) NOT NULL,
    active_this_season boolean DEFAULT true NOT NULL,
    profile_id varchar(255),
    season_id varchar(255),
    statistics_id varchar(255),
    CONSTRAINT players_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS rules (
    id varchar(255) NOT NULL,
    description varchar(9999),
    title varchar(255),
    season_id varchar(255),
    created_by varchar(255),
    CONSTRAINT rules_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS rule_moves (
    id varchar(255) NOT NULL,
    finishing_move boolean NOT NULL,
    name varchar(255),
    points_for_scorer integer NOT NULL,
    points_for_team integer NOT NULL,
    season_id varchar(255),
    CONSTRAINT rule_moves_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS matches (
    id varchar(255) NOT NULL,
    date timestamp(6) with time zone,
    season_id varchar(255),
    created_by varchar(255),
    CONSTRAINT matches_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS teams (
    id varchar(255) NOT NULL,
    match_id varchar(255),
    asset_id_photo varchar(255),
    CONSTRAINT teams_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS team_members (
    id varchar(255) NOT NULL,
    player_id varchar(255),
    team_id varchar(255),
    CONSTRAINT team_members_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS match_moves (
    id varchar(255) NOT NULL,
    value integer NOT NULL,
    move_id varchar(255),
    team_member_id varchar(255),
    CONSTRAINT match_moves_pkey PRIMARY KEY (id)
);

-- +goose StatementBegin
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT * FROM (VALUES
            ('seasons', 'uk8c83jp5s658kdjnh5kjkdhjj', 'UNIQUE (season_settings_id)'),
            ('groups', 'ukf20c4c0theivqx5vjpxdqwih8', 'UNIQUE (active_season_id)'),
            ('groups', 'ukjdreepbjkoxb6xrkredxiyybb', 'UNIQUE (asset_id_wallpaper)'),
            ('profiles', 'ukjtji2yh82qwhtm8j4b1p2dr57', 'UNIQUE (asset_id_avatar)'),
            ('players', 'ukksrlb81vkuck1xa0nr15tw8oj', 'UNIQUE (statistics_id)'),
            ('teams', 'ukoq964sjhma4xrmp81bgv70x2d', 'UNIQUE (asset_id_photo)'),
            ('rules', 'fk135wovgj5tnaygxmayt0rqc3y', 'FOREIGN KEY (season_id) REFERENCES seasons(id)'),
            ('players', 'fk2wkx5ehcmcj65hyv2rojs1n95', 'FOREIGN KEY (statistics_id) REFERENCES statistics(id)'),
            ('matches', 'fk3ehtbdjnpjhowp2023c45kh8r', 'FOREIGN KEY (season_id) REFERENCES seasons(id)'),
            ('seasons', 'fk6id62j9vnijwecj07hst1xtdo', 'FOREIGN KEY (group_id) REFERENCES groups(id)'),
            ('players', 'fk6jn1wcvnmo8scicu40xcf53aq', 'FOREIGN KEY (profile_id) REFERENCES profiles(id)'),
            ('teams', 'fk6paufa0ryaxmhopqhdh01bm2', 'FOREIGN KEY (asset_id_photo) REFERENCES assets(id)'),
            ('profiles', 'fk7uiqcfg9ssepvr068wfetnuhe', 'FOREIGN KEY (group_id) REFERENCES groups(id)'),
            ('groups', 'fk8huqkup6rk5fueoxuex41gt1e', 'FOREIGN KEY (active_season_id) REFERENCES seasons(id)'),
            ('team_members', 'fkd7rlsdpb5gu7k2jdnfqu0dek5', 'FOREIGN KEY (player_id) REFERENCES players(id)'),
            ('rules', 'fkdsg2qmotoxwa9waumapjjierw', 'FOREIGN KEY (created_by) REFERENCES group_members(id)'),
            ('profiles', 'fkfckneosabvbqo2156hpjfei5n', 'FOREIGN KEY (created_by) REFERENCES group_members(id)'),
            ('seasons', 'fkgdw52dr7bjryjq373cp3igcf8', 'FOREIGN KEY (created_by) REFERENCES group_members(id)'),
            ('groups', 'fkhp6hi02li7m04qlbxngne9vrx', 'FOREIGN KEY (asset_id_wallpaper) REFERENCES assets(id)'),
            ('profiles', 'fkhwb1vk3mk4869mkkgmleel1g', 'FOREIGN KEY (asset_id_avatar) REFERENCES assets(id)'),
            ('rule_moves', 'fkj6j2k1fbyrcttrugjslj832ij', 'FOREIGN KEY (season_id) REFERENCES seasons(id)'),
            ('group_members', 'fkkv9vlrye4rmhqjq4qohy2n5a6', 'FOREIGN KEY (group_id) REFERENCES groups(id)'),
            ('seasons', 'fkmnugo14g3khbtgye0gx41e3tr', 'FOREIGN KEY (season_settings_id) REFERENCES season_settings(id)'),
            ('matches', 'fkn8ovdhajhc3kr9l53qrcxbb13', 'FOREIGN KEY (created_by) REFERENCES group_members(id)'),
            ('match_moves', 'fknbn3e6c3vrsx8rsy1rkyj0jmf', 'FOREIGN KEY (team_member_id) REFERENCES team_members(id)'),
            ('match_moves', 'fknhk5fo8qupjqeecx1msqy0by4', 'FOREIGN KEY (move_id) REFERENCES rule_moves(id)'),
            ('group_members', 'fknr9qg33qt2ovmv29g4vc3gtdx', 'FOREIGN KEY (user_id) REFERENCES users(id)'),
            ('groups', 'fko1bm1gsrmol7v2eo3rkiynh4t', 'FOREIGN KEY (created_by) REFERENCES group_members(id)'),
            ('players', 'fkohwx7xp946lcat5vlp7evjm1h', 'FOREIGN KEY (season_id) REFERENCES seasons(id)'),
            ('devices', 'fkrfbri1ymrwywdydc4dgywe1bt', 'FOREIGN KEY (user_id) REFERENCES users(id)'),
            ('teams', 'fkt57boyfe3de2gay7ltdpcxthl', 'FOREIGN KEY (match_id) REFERENCES matches(id)'),
            ('team_members', 'fktgca08el3ofisywcf11f0f76t', 'FOREIGN KEY (team_id) REFERENCES teams(id)')
        ) AS t(tbl, name, def)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name) THEN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', c.tbl, c.name, c.def);
        END IF;
    END LOOP;
END
$$;
-- +goose StatementEnd

-- +goose Down
-- The baseline is shared with the Java backend and is never rolled back.
SELECT 1;
