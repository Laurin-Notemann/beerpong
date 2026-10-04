import { describe, expect, it } from 'vitest';

import { rankPlayers } from '@/constants/rankingAlgorithms';

const player = (name: string, elo: number) => ({
    name,
    elo,
    points: 0,
    matches: 1,
    matchesWon: 0,
    cups: 0,
});

const ranks = (players: ReturnType<typeof player>[]) =>
    rankPlayers(players, 'ELO').map(
        ({ player, placement }) =>
            `${player.name} ${placement.tied ? 'T' : ''}${placement.rank}`
    );

describe('rankPlayers', () => {
    it('shares a rank and skips the next one, golf-style', () => {
        expect(
            ranks([
                player('Dana', 900),
                player('Bo', 1100),
                player('Cleo', 1100),
                player('Ali', 1200),
            ])
        ).toEqual(['Ali 1', 'Bo T2', 'Cleo T2', 'Dana 4']);
    });

    it('ties players whose values show the same, listed by name', () => {
        // both show as "1012"
        expect(ranks([player('Zoe', 1012.4), player('Ada', 1011.6)])).toEqual([
            'Ada T1',
            'Zoe T1',
        ]);
    });

    it('does not sort the input in place', () => {
        const players = [player('Bo', 1), player('Ali', 2)];
        rankPlayers(players, 'ELO');
        expect(players.map((i) => i.name)).toEqual(['Bo', 'Ali']);
    });
});
