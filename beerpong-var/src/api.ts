import { createServerFn } from '@tanstack/react-start';

import { type LiveMatchDto, liveTeams } from '~/liveMatch';

// The API computes everything with the leaderboard's own Elo code
// (/elo-simulation in api-go); this page only shows it. A group opens with its
// invite code, the same code that lets anyone join it in the app.

export type Params = {
    k: number;
    marginWeight: number;
    perPoint: number;
    topWeight: number;
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
    expected: number;
    moves: { name: string; count: number }[];
};

export type GameTeam = {
    won: boolean;
    rating: number;
    winChance: number;
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
    gap: number;
    scale: number;
    teamPoints: number;
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
    defaults: Params;
    params: Params;
    seasons: { id: string; name: string | null; numMatches: number; minMatchesToQualify: number }[];
    seasonId: string | null;
    // what the standings' baseline is: the default weights, or with test or
    // live games the same weights without them
    baseline: 'defaults' | 'storedGames';
    standings: Standing[];
    games: Game[];
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

const apiUrl = () => process.env.API_URL ?? 'https://beerpong.lb.staging.laurinnotemann.dev';

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
        const socketUrl =
            process.env.API_SOCKET_URL ??
            'wss://beerpong.lb.staging.laurinnotemann.dev/update-socket';
        type Data = Omit<Simulation, 'socketUrl' | 'testError'>;
        const live = await liveMatches(inviteCode);
        const simulate = (testGames: TestGame[]) =>
            testGames.length || live.length
                ? call<Data>('/elo-simulation', query, { testGames, liveMatches: live })
                : call<Data>('/elo-simulation', query);
        try {
            const sim = await simulate(tests ?? []);
            return sim && { ...sim, socketUrl };
        } catch (e) {
            if (!(e instanceof ApiError) || e.code !== 'eloInvalidTestGame') throw e;
            // show the real games rather than nothing
            const sim = await simulate([]);
            return sim && { ...sim, socketUrl, testError: e.message };
        }
    });

export const searchWeights = createServerFn({ method: 'GET' })
    .inputValidator((code: string) => code)
    .handler(({ data: code }) =>
        call<Search>('/elo-simulation/search', { inviteCode: code.trim().toUpperCase() })
    );
