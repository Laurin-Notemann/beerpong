import { describe, expect, it } from 'vitest';

import { finishHint, syncLabel, teamNames } from '@/lib/liveMatch/labels';

describe('teamNames', () => {
    it('names one player', () => {
        expect(teamNames(['Anna'])).toBe('Anna');
    });

    it('joins two players with an ampersand', () => {
        expect(teamNames(['Anna', 'Ben'])).toBe('Anna & Ben');
    });

    it('names the first two and counts the rest', () => {
        expect(teamNames(['Anna', 'Ben', 'Cleo'])).toBe('Anna, Ben +1');
        expect(
            teamNames(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])
        ).toBe('A, B +8');
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

describe('syncLabel', () => {
    it('labels each sync state', () => {
        expect(syncLabel('synced', 0)).toBe('Saved');
        expect(syncLabel('syncing', 2)).toBe('Saving…');
        expect(syncLabel('offline', 3)).toBe('Offline · 3 waiting');
    });

    it('leaves out the count when nothing is waiting', () => {
        expect(syncLabel('offline', 0)).toBe('Offline');
    });
});
