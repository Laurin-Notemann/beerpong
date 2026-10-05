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
    /** the group's matches running now; the widget shows them instead of the leaderboard */
    live: WidgetLiveMatch[];
    season: string;
    /** what the value column is, e.g. "Elo" */
    metric: string;
    rows: LeaderboardWidgetRow[];
}

export const emptyLeaderboardWidget: LeaderboardWidgetProps = {
    group: '',
    live: [],
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
    live,
}: {
    group: string;
    season: string;
    players: Player[];
    rankingAlgorithm: RankingAlgorithm | null | undefined;
    minMatchesToQualify: number;
    live: WidgetLiveMatch[];
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
        live,
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

/** a match running now, on the widget */
export interface WidgetLiveMatch extends LiveScore {
    id: string;
    /** epoch ms */
    startedAt: number;
}

/** what the API pushes to a Live Activity (`activityPayload` in apps/api) */
export interface LiveMatchActivityProps extends LiveScore {
    /** epoch ms; the timer counts up from it */
    startedAt: number;
    /** the match was saved: the activity shows the final score until it's dismissed */
    finished: boolean;
}

/** the `liveScores` of the API's silent widget push (`pushWidgets` in apps/api), if it is one */
export function liveScoresOf(
    data: unknown
): { groupId: string; matches: WidgetLiveMatch[] } | undefined {
    const value = (data as { liveScores?: unknown } | null)?.liveScores as
        { groupId?: unknown; matches?: unknown } | undefined;
    if (typeof value?.groupId !== 'string' || !Array.isArray(value.matches)) {
        return;
    }
    const matches = value.matches.filter(
        (i): i is WidgetLiveMatch =>
            typeof i?.id === 'string' &&
            typeof i.blueNames === 'string' &&
            typeof i.redNames === 'string' &&
            typeof i.blueScore === 'number' &&
            typeof i.redScore === 'number' &&
            typeof i.startedAt === 'number'
    );
    return { groupId: value.groupId, matches };
}
