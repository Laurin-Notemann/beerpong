import { describe, expect, it } from 'vitest';

import { rankPlayers } from '~/lib/ranking';

const p = (name: string, elo: number, points = 0, matches = 0) => ({ name, elo, points, matches });

describe('rankPlayers', () => {
    it('shares a rank between players whose value shows the same, and skips the next', () => {
        const ranked = rankPlayers(
            [p('Cleo', 1180), p('Ben', 1200.2), p('Anna', 1199.8), p('Dario', 1300)],
            'ELO'
        );
        expect(ranked.map((i) => [i.player.name, i.rank, i.tied, i.value])).toEqual([
            ['Dario', 1, false, '1300'],
            ['Anna', 2, true, '1200'],
            ['Ben', 2, true, '1200'],
            ['Cleo', 4, false, '1180'],
        ]);
    });

    it('ranks by average points, players without matches last', () => {
        const ranked = rankPlayers(
            [p('Anna', 0, 0, 0), p('Ben', 0, 10, 4), p('Cleo', 0, 9, 3)],
            'AVERAGE'
        );
        expect(ranked.map((i) => [i.player.name, i.value])).toEqual([
            ['Cleo', '3.0'],
            ['Ben', '2.5'],
            ['Anna', '--'],
        ]);
    });
});
