import { createServerFn } from '@tanstack/react-start';

// The API computes everything with the leaderboard's own Elo code
// (GET /elo-simulation in api-go); this page only shows it. A group opens with
// its invite code, the same code that lets anyone join it in the app.

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
    defaultElo: number;
    defaultRank: number;
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
    date: string;
    gap: number;
    scale: number;
    teamPoints: number;
    finisher: string;
    finishMove: string;
    teams: GameTeam[];
};

export type Simulation = {
    groupId: string;
    groupName: string | null;
    defaults: Params;
    params: Params;
    seasons: { id: string; name: string | null; numMatches: number }[];
    seasonId: string | null;
    standings: Standing[];
    games: Game[];
    prediction: { params: Score; defaults: Score };
    // the API's websocket, which announces every change to the group
    socketUrl: string;
};

export type Search = { params: Params; prediction: Score; tried: number };

export type SimulationQuery = { code: string; season?: string } & Partial<Params>;

const apiUrl = () => process.env.API_URL ?? 'https://beerpong.lb.staging.laurinnotemann.dev';

async function get<T>(path: string, query: Record<string, string | number | undefined>) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined) qs.set(key, String(value));
    const res = await fetch(`${apiUrl()}${path}?${qs}`);
    const body = (await res.json().catch(() => undefined)) as
        | { data?: T; error?: { code?: string } }
        | undefined;
    if (res.status === 404 && body?.error?.code === 'groupInviteNotFound') return null;
    if (!res.ok || !body?.data) throw new Error(`${path} answered ${res.status}`);
    return body.data;
}

export const getSimulation = createServerFn({ method: 'GET' })
    .inputValidator((q: SimulationQuery) => q)
    .handler(async ({ data: { code, season, ...params } }): Promise<Simulation | null> => {
        const sim = await get<Omit<Simulation, 'socketUrl'>>('/elo-simulation', {
            inviteCode: code.trim().toUpperCase(),
            seasonId: season,
            ...params,
        });
        if (!sim) return null;
        const socketUrl =
            process.env.API_SOCKET_URL ?? 'wss://beerpong.lb.staging.laurinnotemann.dev/update-socket';
        return { ...sim, socketUrl };
    });

export const searchWeights = createServerFn({ method: 'GET' })
    .inputValidator((code: string) => code)
    .handler(({ data: code }) =>
        get<Search>('/elo-simulation/search', { inviteCode: code.trim().toUpperCase() }),
    );
