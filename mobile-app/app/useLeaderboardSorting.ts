import { Player } from '@/api/calls/seasonHooks';

export enum SortDirection {
    ASCENDING = 'ASCENDING',
    DESCENDING = 'DESCENDING',
}

const direction = (dir: SortDirection) => {
    return dir === SortDirection.DESCENDING ? 1 : -1;
};

export type SortFunction = (
    dir: SortDirection
) => (a: Player, b: Player) => number;

export interface SortOption {
    value: string;
    title: string;
    shortTitle: string;

    sort: SortFunction;
    display: (p: Player) => string;
}

export function useLeaderboardSorting() {
    const sortOptions: SortOption[] = [
        {
            value: 'ELO',
            title: 'Elo',
            shortTitle: 'Elo',

            sort: (dir) => (a, b) => (b.elo - a.elo) * direction(dir),
            display: (p) => p.elo.toFixed(0),
        },
        {
            value: 'AVERAGE',
            title: 'Average Points Scored',
            shortTitle: 'Average',

            sort: (dir) => (a, b) =>
                ((b.matches ? b.points / b.matches : 0) -
                    (a.matches ? a.points / a.matches : 0)) *
                direction(dir),

            display: (p) =>
                p.matches ? (p.points / p.matches).toFixed(1) : '0.0',
        },
        {
            value: 'MATCHES',
            title: 'Matches Played',
            shortTitle: 'Matches',

            sort: (dir) => (a, b) => (b.matches - a.matches) * direction(dir),

            display: (p) => p.matches.toString(),
        },
        {
            value: 'MATCHES_WON',
            title: 'Matches Won',
            shortTitle: 'Matches Won',

            sort: (dir) => (a, b) =>
                (b.matchesWon - a.matchesWon) * direction(dir),

            display: (p) => p.matchesWon.toString(),
        },
        {
            value: 'MATCHES_LOST',
            title: 'Matches Lost',
            shortTitle: 'Matches Lost',

            sort: (dir) => (a, b) =>
                (b.matches - b.matchesWon - (a.matches - a.matchesWon)) *
                direction(dir),

            display: (p) => (p.matches - p.matchesWon).toString(),
        },
    ];
    return { sortOptions };
}
