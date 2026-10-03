import { describe, expect, it } from 'vitest';

import { countCups, cupsPerHit } from '@/api/utils/ruleMoveCups';

const move = (name: string, count: number, finishingMove = false) => ({
    count,
    cups: cupsPerHit({ name, finishingMove }),
});

describe('cups', () => {
    it('a won match adds up to 10 cups', () => {
        // the last cup is entered as a normal hit, the finish on top of it adds none
        expect(
            countCups([
                move('Normal', 6),
                move('Bomb', 1),
                move('Bouncer', 1),
                move('Finish - Normal', 1, true),
            ])
        ).toBe(10);
        // the rings take their whole formation
        expect(
            countCups([
                move('Normal', 6),
                move('Finish - Ring of fire', 1, true),
            ])
        ).toBe(10);
        expect(
            countCups([
                move('Normal', 4),
                move('Finish - Ring of water', 1, true),
            ])
        ).toBe(10);
        // in overtime the deciding save takes no cup
        expect(countCups([move('Normal', 10), move('Save', 1)])).toBe(10);
    });

    it('prefers the count the server sends', () => {
        expect(cupsPerHit({ name: 'Bomb', cups: 3 })).toBe(3);
        expect(cupsPerHit({ name: 'Custom' })).toBe(1);
        expect(cupsPerHit({ name: 'Custom finish', finishingMove: true })).toBe(
            0
        );
    });
});
