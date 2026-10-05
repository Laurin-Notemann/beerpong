import { describe, expect, it } from 'vitest';

import { finishHint, teamNames } from '@/lib/liveMatch/labels';

describe('teamNames', () => {
    it('names one player', () => {
        expect(teamNames(['Anna'])).toBe('Anna');
    });

    it('joins two players with an ampersand', () => {
        expect(teamNames(['Anna', 'Ben'])).toBe('Anna & Ben');
    });

    it('names only the first two of a bigger team', () => {
        expect(teamNames(['Anna', 'Ben', 'Cleo'])).toBe('Anna, Ben');
        expect(
            teamNames(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])
        ).toBe('A, B');
    });

    it('is empty for an empty team', () => {
        expect(teamNames([])).toBe('');
    });
});

describe('finishHint', () => {
    it('asks for the finish while there is none', () => {
        expect(finishHint(0)).toBe('Enter the finish to end the match');
    });

    it('is quiet with exactly one finish', () => {
        expect(finishHint(1)).toBeUndefined();
    });

    it('asks to remove extra finishes', () => {
        expect(finishHint(2)).toBe(
            'Only one finish can count. Remove the extra one'
        );
    });
});
