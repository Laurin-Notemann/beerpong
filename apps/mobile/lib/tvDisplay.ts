// Versus TV's config (apps/web), shared with the app's TV remote. The web app imports this
// module, so keep it plain TypeScript without React Native imports.

/** What a TV shows. The TV keeps a copy, the server relays changes from the phones to it. */
export interface DisplayConfig {
    groupId: string | null;
    groupName: string | null;
    /** auto: the leaderboard next to a live match while any is live, else only the leaderboard */
    view: View;
    scope: Scope;
    /** the season of the leaderboard; null follows the group's active season */
    seasonId: string | null;
    /**
     * live matches the TV shows first, in this order; the rest fill up by latest activity. Next
     * to the leaderboard only the first one shows.
     */
    pinnedMatchIds: string[];
    /** a live match on the whole screen, until it ends or a phone leaves it */
    focusMatchId: string | null;
}

export const views = ['auto', 'leaderboard', 'live'] as const;
export type View = (typeof views)[number];

export const scopes = ['season', 'today', 'all-time'] as const;
export type Scope = (typeof scopes)[number];

/** how many live matches the Live view shows at once */
export const MAX_MATCHES = 3;

export const emptyConfig: DisplayConfig = {
    groupId: null,
    groupName: null,
    view: 'auto',
    scope: 'season',
    seasonId: null,
    pinnedMatchIds: [],
    focusMatchId: null,
};

/** what a phone may change; the group goes through connectGroup, which joins it */
export type DisplayPatch = Partial<
    Pick<
        DisplayConfig,
        'view' | 'scope' | 'seasonId' | 'pinnedMatchIds' | 'focusMatchId'
    >
>;

const isString = (v: unknown): v is string => typeof v === 'string';

/** the parts of `value` that are a valid patch; anything else is dropped */
export function parsePatch(value: unknown): DisplayPatch {
    const patch: DisplayPatch = {};
    if (!value || typeof value !== 'object') return patch;
    const v = value as Record<string, unknown>;

    if (views.includes(v.view as View)) patch.view = v.view as View;
    if (scopes.includes(v.scope as Scope)) patch.scope = v.scope as Scope;
    if (v.seasonId === null || isString(v.seasonId))
        patch.seasonId = v.seasonId;
    if (v.focusMatchId === null || isString(v.focusMatchId))
        patch.focusMatchId = v.focusMatchId;
    if (Array.isArray(v.pinnedMatchIds) && v.pinnedMatchIds.every(isString)) {
        patch.pinnedMatchIds = [...new Set(v.pinnedMatchIds)].slice(
            0,
            MAX_MATCHES
        );
    }
    return patch;
}

/** a config read back from storage or a client, with defaults for anything missing or wrong */
export function parseConfig(value: unknown): DisplayConfig {
    const v = (value && typeof value === 'object' ? value : {}) as Record<
        string,
        unknown
    >;
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
    const pinned = pinnedIds.flatMap(
        (id) => live.find((i) => i.id === id) ?? []
    );
    const rest = live
        .filter((i) => !pinnedIds.includes(i.id))
        .slice(0, Math.max(0, MAX_MATCHES - pinned.length))
        .sort(byStart);
    return [...pinned, ...rest].slice(0, MAX_MATCHES);
}

/** oldest first; for lists that shouldn't move while matches are played */
export const byStart = (a: { startedAt: string }, b: { startedAt: string }) =>
    a.startedAt.localeCompare(b.startedAt);

/**
 * What the TV shows: a focused live match on the whole screen while it's live; in auto the
 * leaderboard next to one live match while any is live, else only the leaderboard.
 */
export function layoutFor(
    config: Pick<DisplayConfig, 'view' | 'focusMatchId'>,
    liveIds: string[]
) {
    if (config.focusMatchId && liveIds.includes(config.focusMatchId))
        return 'focus';
    if (config.view === 'leaderboard') return 'leaderboard';
    if (config.view === 'live') return 'live';
    return liveIds.length > 0 ? 'split' : 'leaderboard';
}

/** what a remote shows as chosen: one of the views, or a live match on the whole screen */
export type Screen = View | 'focus';

export const screenOf = (
    config: Pick<DisplayConfig, 'view' | 'focusMatchId'>,
    liveIds: string[]
): Screen => (layoutFor(config, liveIds) === 'focus' ? 'focus' : config.view);
