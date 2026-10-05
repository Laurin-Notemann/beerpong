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

export interface LiveMatchActivityProps {
    blueNames: string;
    blueScore: number;
    redNames: string;
    redScore: number;
    /** epoch ms; the timer counts up from it */
    startedAt: number;
    /** the match was saved: the activity shows the final score until it's dismissed */
    finished: boolean;
}

export function toLiveMatchActivity({
    blue,
    red,
    startedAt,
}: {
    blue: LiveMatchTeam;
    red: LiveMatchTeam;
    startedAt: string;
}): LiveMatchActivityProps {
    // there's no "+N" avatar here, so the names say how many more there are
    const names = ({ players }: LiveMatchTeam) =>
        teamNames(players.map((i) => i.name)) +
        (players.length > 2 ? ` +${players.length - 2}` : '');

    return {
        blueNames: names(blue),
        blueScore: blue.score,
        redNames: names(red),
        redScore: red.score,
        startedAt: Date.parse(startedAt) || Date.now(),
        finished: false,
    };
}
