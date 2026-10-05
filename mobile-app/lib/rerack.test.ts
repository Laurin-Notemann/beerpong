import { describe, expect, it } from 'vitest';

import { CUP_FORMATION, CupHit, standingCups } from '@/lib/cupHits';
import { cupAt, cupLayout, rerack } from '@/lib/rerack';

const triangle = {
    id: 'triangle',
    cups: [
        { x: 2, y: 4 },
        { x: 4, y: 4 },
        { x: 3, y: 6 },
    ],
};

/** red hit down to the first `left` cups of the pyramid's back rows */
function hitsLeaving(left: number): CupHit[] {
    return CUP_FORMATION.cups.slice(left).map((cup) => ({
        team: 'red',
        playerId: 'carl',
        moveId: 'normal',
        cups: [cup],
    }));
}

describe('re-racking', () => {
    it('only fits a formation with as many cups as are left', () => {
        expect(rerack(hitsLeaving(4), 'red', triangle)).toBeUndefined();
        expect(rerack(hitsLeaving(3), 'red', triangle)).toBeDefined();
    });

    it('draws each standing cup in the formation, and a tap there hits that cup', () => {
        const hits = hitsLeaving(3);
        const layout = cupLayout(hits, 'red', rerack(hits, 'red', triangle));

        expect(layout.map((i) => i.drawn)).toEqual(triangle.cups);
        expect(layout.map((i) => i.cup)).toEqual(standingCups(hits, 'red'));
        expect(cupAt(layout, { x: 3, y: 6 })).toEqual(
            standingCups(hits, 'red')[2]
        );
    });

    it('goes back to the pyramid once a cup from before the re-rack is put back', () => {
        const hits = hitsLeaving(3);
        const reracked = rerack(hits, 'red', triangle);

        const layout = cupLayout(hits.slice(1), 'red', reracked);

        expect(layout.map((i) => i.drawn)).toEqual(CUP_FORMATION.cups);
    });
});
