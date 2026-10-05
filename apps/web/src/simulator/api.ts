import { createServerFn } from '@tanstack/react-start';

import { apiUrl, socketUrl } from '~/apiUrl';
import { type LiveMatchDto, liveTeams, type ReplayStep } from '~/simulator/liveMatch';

// The API computes everything with the leaderboard's own Elo code
// (/elo-simulation in apps/api); this page only shows it. A group opens with its
// invite code, the same code that lets anyone join it in the app.

// The Elo's weights, a season setting (EloParams in elo.go).
export type Params = {
    k: number;
    kr: number;
    ringWeight: number;
    swing: number;
};

export type Score = { logLoss: number; correct: number; called: number; games: number };

export type Standing = {
    profileId: string;
    name: string;
    elo: number;
    // null while unranked (fewer matches than the season requires)
    rank: number | null;
    // the same player in the baseline (see Simulation.baseline)
    baselineElo: number | null;
    baselineRank: number | null;
    matches: number;
    wins: number;
    points: number;
    result: number;
    hitting: number;
};

export type GamePlayer = {
    profileId: string;
    name: string;
    points: number;
    own: number;
    before: number;
    after: number;
    result: number;
    hitting: number;
    // the player's share of the game's own points, set before it
    share: number;
    // share × the game's points
    expected: number;
    moves: { name: string; count: number }[];
};

export type GameTeam = {
    won: boolean;
    winChance: number;
    // the team's share of the game's own points, set before it
    share: number;
    points: number;
    avgPoints: number;
    cups: number;
    players: GamePlayer[];
};

export type Game = {
    matchId: string;
    // the test game's place in Search.tests; null for other games
    testIndex: number | null;
    // the running live match this game is, counted as if it ended now
    liveMatchId: string | null;
    date: string;
    // own points of both teams, what the shares are of
    points: number;
    // own points of an average full game before this one
    fullPoints: number;
    // what the result counted: more than 1 for a ring win
    ring: number;
    finisher: string;
    finishMove: string;
    teams: GameTeam[];
};

export type RuleMove = {
    id: string;
    name: string;
    pointsForScorer: number;
    pointsForTeam: number;
    finishing: boolean;
};

export type Simulation = {
    groupId: string;
    groupName: string | null;
    // the selected season's weights
    defaults: Params;
    params: Params;
    seasons: {
        id: string;
        name: string | null;
        numMatches: number;
        minMatchesToQualify: number;
        elo: Params;
    }[];
    seasonId: string | null;
    // what the standings' baseline is: the season's weights, or with test or
    // live games the same weights without them
    baseline: 'defaults' | 'storedGames';
    standings: Standing[];
    games: Game[];
    // defaults: every season with its own weights
    prediction: { params: Score; defaults: Score };
    // what a test game can be made of
    moves: RuleMove[];
    profiles: { id: string; name: string }[];
    // the API's websocket, which announces every change to the group
    socketUrl: string;
    // set when the test games couldn't be counted (their game is gone, say)
    testError?: string;
};

// A made-up game, rated right after the game `after` ("start" before the
// first, "end" after the last). Never stored.
export type TestGame = {
    after: string;
    teams: { profileId: string; moves: { moveId: string; count: number }[] }[][];
};

export type Search = { params: Params; prediction: Score; tried: number };

export type SimulationQuery = {
    code: string;
    season?: string;
    tests?: TestGame[];
} & Partial<Params>;

class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string | undefined,
        message: string
    ) {
        super(message);
    }
}

async function call<T>(
    path: string,
    query: Record<string, string | number | undefined>,
    body?: unknown
) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
        if (value !== undefined) qs.set(key, String(value));
    const res = await fetch(`${apiUrl()}${path}?${qs}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => undefined)) as
        { data?: T; error?: { code?: string; description?: string } } | undefined;
    if (res.status === 404 && json?.error?.code === 'groupInviteNotFound') return null;
    if (!res.ok || !json?.data) {
        throw new ApiError(
            res.status,
            json?.error?.code,
            json?.error?.description ?? `${path} answered ${res.status}`
        );
    }
    return json.data;
}

// The group's running live matches, reduced to their teams like on the phones; the API counts
// them as if they ended now. A live match that can't be read is left out rather than failing
// the page.
async function liveMatches(inviteCode: string) {
    const list = await call<LiveMatchDto[]>('/elo-simulation/live-matches', { inviteCode }).catch(
        () => null
    );
    return (list ?? []).flatMap((dto) => {
        try {
            const teams = liveTeams(dto);
            return teams && dto.id ? [{ liveMatchId: dto.id, teams }] : [];
        } catch {
            return [];
        }
    });
}

// POST so the test games don't have to fit in a URL
export const getSimulation = createServerFn({ method: 'POST' })
    .inputValidator((q: SimulationQuery) => q)
    .handler(async ({ data: { code, season, tests, ...params } }): Promise<Simulation | null> => {
        const inviteCode = code.trim().toUpperCase();
        const query = { inviteCode, seasonId: season, ...params };
        const socket = socketUrl();
        type Data = Omit<Simulation, 'socketUrl' | 'testError'>;
        const live = await liveMatches(inviteCode);
        const simulate = (testGames: TestGame[]) =>
            testGames.length || live.length
                ? call<Data>('/elo-simulation', query, { testGames, liveMatches: live })
                : call<Data>('/elo-simulation', query);
        try {
            const sim = await simulate(tests ?? []);
            return sim && { ...sim, socketUrl: socket };
        } catch (e) {
            if (!(e instanceof ApiError) || e.code !== 'eloInvalidTestGame') throw e;
            // show the real games rather than nothing
            const sim = await simulate([]);
            return sim && { ...sim, socketUrl: socket, testError: e.message };
        }
    });

export const searchWeights = createServerFn({ method: 'GET' })
    .inputValidator((code: string) => code)
    .handler(({ data: code }) =>
        call<Search>('/elo-simulation/search', { inviteCode: code.trim().toUpperCase() })
    );

// The season's live matches that became a match, with their whole log, to replay.
export const getReplays = createServerFn({ method: 'GET' })
    .inputValidator((q: { code: string; season: string }) => q)
    .handler(async ({ data: { code, season } }) => {
        const list = await call<LiveMatchDto[]>('/elo-simulation/replays', {
            inviteCode: code.trim().toUpperCase(),
            seasonId: season,
        });
        return list ?? [];
    });

// A stored match rated after every step of its live log, then as stored: one game per step
// and the stored one last, each from the ratings before the match.
export const getReplay = createServerFn({ method: 'POST' })
    .inputValidator(
        (q: {
            code: string;
            season: string;
            params: Params;
            matchId: string;
            steps: ReplayStep[];
        }) => q
    )
    .handler(async ({ data: { code, season, params, matchId, steps } }) => {
        const sim = await call<{ replay: Game[] }>(
            '/elo-simulation',
            { inviteCode: code.trim().toUpperCase(), seasonId: season, ...params },
            { replay: { matchId, steps } }
        );
        return sim?.replay ?? [];
    });
