/** What a TV shows. The TV keeps a copy, the server relays changes from the phones to it. */
export interface DisplayConfig {
    groupId: string | null;
    groupName: string | null;
    /** auto: live matches next to the leaderboard while any are live, else the leaderboard */
    view: View;
    scope: Scope;
    /** the season of the leaderboard; null follows the group's active season */
    seasonId: string | null;
    /** live matches the TV shows first, in this order; the rest fill up by latest activity */
    pinnedMatchIds: string[];
}

export const views = ['auto', 'leaderboard', 'live'] as const;
export type View = (typeof views)[number];

export const scopes = ['season', 'today', 'all-time'] as const;
export type Scope = (typeof scopes)[number];

/** how many live matches fit next to the leaderboard on a 1080p screen */
export const MAX_MATCHES = 3;

export const emptyConfig: DisplayConfig = {
    groupId: null,
    groupName: null,
    view: 'auto',
    scope: 'season',
    seasonId: null,
    pinnedMatchIds: [],
};

/** what a phone may change; the group goes through connectGroup, which joins it */
export type DisplayPatch = Partial<
    Pick<DisplayConfig, 'view' | 'scope' | 'seasonId' | 'pinnedMatchIds'>
>;

const isString = (v: unknown): v is string => typeof v === 'string';

/** the parts of `value` that are a valid patch; anything else is dropped */
export function parsePatch(value: unknown): DisplayPatch {
    const patch: DisplayPatch = {};
    if (!value || typeof value !== 'object') return patch;
    const v = value as Record<string, unknown>;

    if (views.includes(v.view as View)) patch.view = v.view as View;
    if (scopes.includes(v.scope as Scope)) patch.scope = v.scope as Scope;
    if (v.seasonId === null || isString(v.seasonId)) patch.seasonId = v.seasonId;
    if (Array.isArray(v.pinnedMatchIds) && v.pinnedMatchIds.every(isString)) {
        patch.pinnedMatchIds = [...new Set(v.pinnedMatchIds)].slice(0, MAX_MATCHES);
    }
    return patch;
}

/** a config read back from storage or a client, with defaults for anything missing or wrong */
export function parseConfig(value: unknown): DisplayConfig {
    const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    return {
        ...emptyConfig,
        ...parsePatch(v),
        groupId: isString(v.groupId) ? v.groupId : null,
        groupName: isString(v.groupName) ? v.groupName : null,
    };
}

/**
 * The live matches a TV shows, at most `MAX_MATCHES`: the pinned ones still live, in pin order,
 * then the most recently active others (`live` comes most recently active first). Those are
 * shown in the order they started, so a cup hit doesn't make the cards swap places.
 */
export function pickMatches<T extends { id: string; startedAt: string }>(
    live: T[],
    pinnedIds: string[]
): T[] {
    const pinned = pinnedIds.flatMap((id) => live.find((i) => i.id === id) ?? []);
    const rest = live
        .filter((i) => !pinnedIds.includes(i.id))
        .slice(0, Math.max(0, MAX_MATCHES - pinned.length))
        .sort(byStart);
    return [...pinned, ...rest].slice(0, MAX_MATCHES);
}

/** oldest first; for lists that shouldn't move while matches are played */
export const byStart = (a: { startedAt: string }, b: { startedAt: string }) =>
    a.startedAt.localeCompare(b.startedAt);

/** what the TV shows with this many live matches */
export function layoutFor(view: View, liveCount: number) {
    if (view === 'leaderboard') return 'leaderboard';
    if (view === 'live') return 'live';
    return liveCount > 0 ? 'split' : 'leaderboard';
}
