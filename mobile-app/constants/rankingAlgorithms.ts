import { Player } from '@/api/calls/seasonHooks';

export type RankingPlayer = Omit<Player, 'id' | 'profileId'>;

const byDescendingAveragePoints = (a: RankingPlayer, b: RankingPlayer) =>
    (b.matches ? b.points / b.matches : 0) -
    (a.matches ? a.points / a.matches : 0);

const byDescendingElo = (a: RankingPlayer, b: RankingPlayer) => b.elo - a.elo;

const byDescendingMatchesPlayed = (a: RankingPlayer, b: RankingPlayer) =>
    b.matches - a.matches;

const byDescendingMatchesWon = (a: RankingPlayer, b: RankingPlayer) =>
    b.matchesWon / b.matches - a.matchesWon / a.matches;

const byDescendingTotalPoints = (a: RankingPlayer, b: RankingPlayer) =>
    b.points - a.points;

const byDescendingTotalCups = (a: RankingPlayer, b: RankingPlayer) =>
    b.cups - a.cups;

const formatElo = (value?: number) =>
    Number.isNaN(value) ? '--' : (value?.toFixed(0) ?? '--');

const formatAverage = (value?: number) =>
    Number.isNaN(value) ? '--' : (value?.toFixed(1) ?? '--');

const formatWinRate = (matchesPlayed?: number, matchesWon?: number) => {
    if (matchesPlayed == null || matchesWon == null) return '--';

    const winRatePercentage = Math.round((matchesWon / matchesPlayed) * 100);

    if (Number.isNaN(winRatePercentage)) return '--';

    return winRatePercentage + '%';
};

interface AlgoObj {
    name: string;
    shortName: string;
    sortFunc: (a: RankingPlayer, b: RankingPlayer) => number;
    getDisplayValue: (
        a: RankingPlayer | null | undefined,
        role?: 'stat' | 'ranking'
    ) => string;
    showInSelect: boolean;
    showInStats: boolean;
}

export const rankingAlgorithms = {
    ELO: {
        name: 'Elo',
        shortName: 'Elo',
        sortFunc: byDescendingElo,
        getDisplayValue: (a) => (a ? formatElo(a.elo) : '--'),
        showInSelect: true,
        showInStats: true,
    },
    AVERAGE: {
        name: 'Average points',
        shortName: 'Average',
        sortFunc: byDescendingAveragePoints,
        getDisplayValue: (a) =>
            (a?.matches ?? 0) > 0
                ? formatAverage(a!.matches ? a!.points / a!.matches : 0)
                : '--',
        showInSelect: true,
        showInStats: true,
    },
    MATCHES_WON: {
        name: 'Matches won',
        shortName: 'Matches won',
        sortFunc: byDescendingMatchesWon,
        getDisplayValue: (a, role = 'ranking') =>
            role === 'ranking'
                ? a
                    ? formatWinRate(a.matches, a.matchesWon)
                    : '--'
                : a?.matches
                  ? `${a.matchesWon} of ${a.matches} (${formatWinRate(
                        a.matches,
                        a.matchesWon
                    )})`
                  : '--',
        showInSelect: true,
        showInStats: true,
    },
    TOTAL_POINTS: {
        name: 'Total points',
        shortName: 'Points',
        sortFunc: byDescendingTotalPoints,
        getDisplayValue: (a) =>
            (a?.matches ?? 0) > 0 ? a!.points.toString() : '--',
        showInSelect: true,
        showInStats: true,
    },
    TOTAL_CUPS: {
        name: 'Total cups',
        shortName: 'Cups',
        sortFunc: byDescendingTotalCups,
        getDisplayValue: (a) =>
            (a?.matches ?? 0) > 0 ? a!.cups.toString() : '--',
        showInSelect: true,
        showInStats: true,
    },
    MATCHES_PLAYED: {
        name: 'Matches played',
        shortName: 'Matches played',
        sortFunc: byDescendingMatchesPlayed,
        getDisplayValue: (a) =>
            (a?.matches ?? 0) > 0 ? a!.matches.toString() : '--',
        showInSelect: true,
        showInStats: false,
    },
} satisfies Record<string, AlgoObj>;

export type RankingAlgorithm = keyof typeof rankingAlgorithms;

export const getRankingAlgorithm = (
    algo: RankingAlgorithm | null | undefined
) => {
    if (!algo) return rankingAlgorithms.ELO;

    return rankingAlgorithms[algo] ?? rankingAlgorithms.ELO;
};
