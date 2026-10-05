/**
 * The leaderboard's order, as the app ranks it (mobile-app/constants/rankingAlgorithms.ts, for
 * the two algorithms a season can pick): golf-style, players whose value shows the same share a
 * rank and the next one is skipped (1, T2, T2, 4); tied players are listed by name.
 */
export type RankingAlgorithm = 'ELO' | 'AVERAGE';

export interface RankedStats {
    name: string;
    elo: number;
    points: number;
    matches: number;
}

export const rankingNames: Record<RankingAlgorithm, string> = {
    ELO: 'Elo',
    AVERAGE: 'Average points',
};

export function displayValue(algo: RankingAlgorithm, p: RankedStats) {
    if (algo === 'ELO') return Number.isFinite(p.elo) ? p.elo.toFixed(0) : '--';
    return p.matches > 0 ? (p.points / p.matches).toFixed(1) : '--';
}

const sortValue = (algo: RankingAlgorithm, p: RankedStats) =>
    algo === 'ELO' ? p.elo : p.matches ? p.points / p.matches : 0;

export function rankPlayers<T extends RankedStats>(players: readonly T[], algo: RankingAlgorithm) {
    const sorted = [...players].sort((a, b) => sortValue(algo, b) - sortValue(algo, a));

    const ranked: { player: T; rank: number; tied: boolean; value: string }[] = [];
    for (let start = 0; start < sorted.length;) {
        const value = displayValue(algo, sorted[start]);
        let end = start + 1;
        while (end < sorted.length && displayValue(algo, sorted[end]) === value) end++;

        const tied = end - start > 1;
        sorted
            .slice(start, end)
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((player) => ranked.push({ player, rank: start + 1, tied, value }));
        start = end;
    }
    return ranked;
}
