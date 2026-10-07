import type { Player } from '@/api/calls/seasonHooks';
import type { LiveMatchTeam } from '@/api/liveMatch/useGroupLiveMatches';
import {
    getRankingAlgorithm,
    type RankingAlgorithm,
    rankPlayers,
} from '@/constants/rankingAlgorithms';
import { teamNames } from '@/lib/liveMatch/labels';

// Widget and Live Activity props cross into the widget extension as JSON, so they hold only
// strings, numbers and booleans (dates as epoch ms).

/** the most rows a widget shows (the large one) */
const MAX_LEADERBOARD_ROWS = 10;

export interface LeaderboardWidgetRow {
    /** "1", "T2" */
    rank: string;
    name: string;
    /** the ranking's value as the app shows it, e.g. "1612" or "2.4" */
    value: string;
}

export interface LeaderboardWidgetProps {
    /** empty while no group is selected */
    group: string;
    season: string;
    /** what the value column is, e.g. "Elo" */
    metric: string;
    rows: LeaderboardWidgetRow[];
}

export const emptyLeaderboardWidget: LeaderboardWidgetProps = {
    group: '',
    season: '',
    metric: '',
    rows: [],
};

/** the season leaderboard's ranked players, top first, as the leaderboard tab ranks them */
export function toLeaderboardWidget({
    group,
    season,
    players,
    rankingAlgorithm,
    minMatchesToQualify,
}: {
    group: string;
    season: string;
    players: Player[];
    rankingAlgorithm: RankingAlgorithm | null | undefined;
    minMatchesToQualify: number;
}): LeaderboardWidgetProps {
    const algo = getRankingAlgorithm(rankingAlgorithm);
    const ranked = rankPlayers(
        players.filter(
            (i) => i.matches > 0 && i.matches >= minMatchesToQualify
        ),
        rankingAlgorithm
    );

    return {
        group,
        season,
        metric: algo.shortName,
        rows: ranked
            .slice(0, MAX_LEADERBOARD_ROWS)
            .map(({ player, placement }) => ({
                rank: `${placement.tied ? 'T' : ''}${placement.rank}`,
                name: player.name,
                value: algo.getDisplayValue(player),
            })),
    };
}

/**
 * A live match's score as the app shows it. Phones report it to the API at the seq they computed
 * it for (`PUT .../display`), and the API pushes it to Live Activities and widgets.
 */
export interface LiveScore {
    blueNames: string;
    blueScore: number;
    redNames: string;
    redScore: number;
}

export function toLiveScore({
    blue,
    red,
}: {
    blue: LiveMatchTeam;
    red: LiveMatchTeam;
}): LiveScore {
    // there's no "+N" avatar here, so the names say how many more there are
    const names = ({ players }: LiveMatchTeam) =>
        teamNames(players.map((i) => i.name)) +
        (players.length > 2 ? ` +${players.length - 2}` : '');

    return {
        blueNames: names(blue),
        blueScore: blue.score,
        redNames: names(red),
        redScore: red.score,
    };
}

export interface WidgetPlayer {
    name: string;
    team: 'red' | 'blue';
    /** how much their season Elo changes if the match ends now; only the API's pushes have it */
    elo?: number;
}

export interface WidgetMove {
    name: string;
    team: 'red' | 'blue';
    move: string;
    /** the score right after it, e.g. "2–0" */
    score?: string;
}

/** a match running now, on the widget */
export interface WidgetLiveMatch extends LiveScore {
    id: string;
    /** epoch ms */
    startedAt: number;
    players?: WidgetPlayer[];
    /** newest first */
    moves?: WidgetMove[];
}

export interface LiveMatchesWidgetProps {
    /** empty while no group is selected */
    group: string;
    /**
     * the selected group's id: a push for another group is ignored. Read from here, since the app's
     * storage can't be read while the phone is locked (missing in props written by older versions)
     */
    groupId?: string;
    matches: WidgetLiveMatch[];
    /** the match it shows; its button moves on to the next one */
    selectedId?: string;
}

/**
 * New props for the widget, keeping what only the widget knows (the match picked with its button)
 * and what only the API's pushes have (the Elo), for the matches and players still there.
 */
export function mergeLiveMatches(
    next: LiveMatchesWidgetProps,
    previous: LiveMatchesWidgetProps | undefined
): LiveMatchesWidgetProps {
    const elo = new Map(
        (previous?.matches ?? []).flatMap((m) =>
            (m.players ?? []).map((p) => [`${m.id} ${p.name}`, p.elo] as const)
        )
    );
    return {
        ...next,
        selectedId: previous?.selectedId,
        matches: next.matches.map((m) => ({
            ...m,
            players: m.players?.map((p) => ({
                ...p,
                elo: p.elo ?? elo.get(`${m.id} ${p.name}`),
            })),
        })),
    };
}

/** what the API pushes to a Live Activity (`activityPayload` in apps/api) */
export interface LiveMatchActivityProps extends LiveScore {
    /** epoch ms; the timer counts up from it */
    startedAt: number;
    /** the match was saved; its end takes the activity off the Lock Screen right away */
    finished: boolean;
    /** each team's own cups as they're drawn (`rackCode`); missing from older pushes */
    blueCups?: string;
    redCups?: string;
    /** each team's players, at most 6; `avatar` is the asset id of their avatar's local copy */
    bluePlayers?: ActivityPlayer[];
    redPlayers?: ActivityPlayer[];
}

export interface ActivityPlayer {
    name: string;
    avatar?: string;
}

/** the `liveScores` of the API's silent widget push (`pushWidgets` in apps/api), if it is one */
export function liveScoresOf(
    data: unknown
): { groupId: string; matches: WidgetLiveMatch[] } | undefined {
    const value = (data as { liveScores?: unknown } | null)?.liveScores as
        | { groupId?: unknown; matches?: unknown }
        | undefined;
    if (typeof value?.groupId !== 'string' || !Array.isArray(value.matches)) {
        return;
    }
    const isTeam = (team: unknown) => team === 'red' || team === 'blue';
    const isRecord = (item: unknown): item is Record<string, unknown> =>
        item !== null && typeof item === 'object';
    const matches = value.matches
        .filter(
            (i: unknown): i is WidgetLiveMatch =>
                isRecord(i) &&
                typeof i.id === 'string' &&
                typeof i.blueNames === 'string' &&
                typeof i.redNames === 'string' &&
                typeof i.blueScore === 'number' &&
                typeof i.redScore === 'number' &&
                typeof i.startedAt === 'number'
        )
        .map((i) => ({
            ...i,
            players: Array.isArray(i.players)
                ? i.players.filter(
                      (p: unknown): p is WidgetPlayer =>
                          isRecord(p) &&
                          typeof p.name === 'string' &&
                          isTeam(p.team) &&
                          (p.elo === undefined || typeof p.elo === 'number')
                  )
                : undefined,
            moves: Array.isArray(i.moves)
                ? i.moves.filter(
                      (m: unknown): m is WidgetMove =>
                          isRecord(m) &&
                          typeof m.name === 'string' &&
                          isTeam(m.team) &&
                          typeof m.move === 'string'
                  )
                : undefined,
        }));
    return { groupId: value.groupId, matches };
}
