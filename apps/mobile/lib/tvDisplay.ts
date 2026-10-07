// Versus TV's config (apps/web), shared with the app's TV remote. The web app imports this
// module, so keep it plain TypeScript without React Native imports.

/** What a TV shows. The TV keeps a copy, the server relays changes from the phones to it. */
export interface DisplayConfig {
    groupId: string | null;
    groupName: string | null;
    /** auto: leaderboard while idle, camera or one full-screen match while live */
    view: View;
    scope: Scope;
    /** the season of the leaderboard; null follows the group's active season */
    seasonId: string | null;
    /**
     * live matches the TV shows first, in this order; the rest fill up by latest activity.
     * Auto and Camera use only the first one.
     */
    pinnedMatchIds: string[];
    /** a live match on the whole screen, until it ends or a phone leaves it */
    focusMatchId: string | null;
    /**
     * the camera Auto and Camera use; if unavailable, prefer one filming cameraSubject,
     * then the group's first online camera
     */
    cameraId: string | null;
    /** swap the scoreboard sides on the camera video, without changing the match */
    cameraOverlayFlipped: boolean;
    /** what this camera films; on a TV, the preferred subject if its camera is replaced */
    cameraSubject: CameraSubject;
    /** mirror this camera's video horizontally, independently of the scoreboard */
    cameraVideoFlipped: boolean;
}

export const cameraSubjects = ['table', 'blue', 'red'] as const;
export type CameraSubject = (typeof cameraSubjects)[number];
export const cameraSubjectLabel: Record<CameraSubject, string> = {
    table: 'Table',
    blue: 'Blue team',
    red: 'Red team',
};
export type CameraPatch = Partial<
    Pick<DisplayConfig, 'cameraSubject' | 'cameraVideoFlipped'>
>;

/** camera: a camera's video on the whole screen, the score over it */
export const views = ['auto', 'leaderboard', 'live', 'camera'] as const;
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
    cameraId: null,
    cameraOverlayFlipped: false,
    cameraSubject: 'table',
    cameraVideoFlipped: false,
};

/** what a phone may change; the group goes on with the app's Add TV, which joins it */
export type DisplayPatch = Partial<
    Pick<
        DisplayConfig,
        | 'view'
        | 'scope'
        | 'seasonId'
        | 'pinnedMatchIds'
        | 'focusMatchId'
        | 'cameraId'
        | 'cameraOverlayFlipped'
        | 'cameraSubject'
        | 'cameraVideoFlipped'
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
    if (v.cameraId === null || isString(v.cameraId))
        patch.cameraId = v.cameraId;
    if (typeof v.cameraOverlayFlipped === 'boolean')
        patch.cameraOverlayFlipped = v.cameraOverlayFlipped;
    if (cameraSubjects.includes(v.cameraSubject as CameraSubject))
        patch.cameraSubject = v.cameraSubject as CameraSubject;
    if (typeof v.cameraVideoFlipped === 'boolean')
        patch.cameraVideoFlipped = v.cameraVideoFlipped;
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
 * Auto shows the leaderboard while idle, then the camera if video is available, otherwise
 * one full-screen live match. Explicit Camera stays on the feed even without a live match.
 */
export function layoutFor(
    config: Pick<DisplayConfig, 'view' | 'focusMatchId'>,
    liveIds: string[],
    cameraAvailable = false
) {
    if (config.focusMatchId && liveIds.includes(config.focusMatchId))
        return 'focus';
    if (config.view === 'leaderboard') return 'leaderboard';
    if (config.view === 'live') return 'live';
    if (config.view === 'camera') return 'camera';
    return liveIds.length > 0
        ? cameraAvailable
            ? 'camera'
            : 'focus'
        : 'leaderboard';
}

/** what a remote shows as chosen: one of the views, or a live match on the whole screen */
export type Screen = View | 'focus';

export const screenOf = (
    config: Pick<DisplayConfig, 'view' | 'focusMatchId'>,
    liveIds: string[]
): Screen =>
    config.focusMatchId && liveIds.includes(config.focusMatchId)
        ? 'focus'
        : config.view;
