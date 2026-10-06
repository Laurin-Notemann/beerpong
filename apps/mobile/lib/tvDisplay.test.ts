import { describe, expect, it } from 'vitest';

import { layoutFor, parsePatch, pickMatches } from '@/lib/tvDisplay';

// most recently active first, as the board lists them
const live = [
    { id: 'd', startedAt: '2026-10-05T20:30:00Z' },
    { id: 'a', startedAt: '2026-10-05T20:00:00Z' },
    { id: 'c', startedAt: '2026-10-05T20:20:00Z' },
    { id: 'b', startedAt: '2026-10-05T20:10:00Z' },
];
const ids = (list: { id: string }[]) => list.map((i) => i.id);

describe('pickMatches', () => {
    it('shows the three most recently active, in the order they started', () => {
        expect(ids(pickMatches(live, []))).toEqual(['a', 'c', 'd']);
    });

    it('puts pinned matches first, in pin order, and fills up with the most recently active', () => {
        expect(ids(pickMatches(live, ['b', 'c']))).toEqual(['b', 'c', 'd']);
    });

    it('skips pins of matches that ended', () => {
        expect(ids(pickMatches(live, ['gone', 'b']))).toEqual(['b', 'a', 'd']);
    });

    it('keeps the cards in place when another match gets a hit', () => {
        const afterHit = [live[2], live[0], live[1], live[3]];
        expect(ids(pickMatches(afterHit, []))).toEqual(
            ids(pickMatches(live, []))
        );
    });
});

describe('parsePatch', () => {
    it('keeps valid fields and drops the rest', () => {
        expect(
            parsePatch({
                view: 'live',
                scope: 'nope',
                groupId: 'x',
                seasonId: null,
            })
        ).toEqual({
            view: 'live',
            seasonId: null,
        });
    });

    it('dedupes pins and caps them at what fits on the TV', () => {
        expect(
            parsePatch({ pinnedMatchIds: ['a', 'a', 'b', 'c', 'd'] })
        ).toEqual({
            pinnedMatchIds: ['a', 'b', 'c'],
        });
    });
});

describe('layoutFor', () => {
    it('puts a focused match on the whole screen only while it is live', () => {
        expect(
            layoutFor({ view: 'leaderboard', focusMatchId: 'a' }, ['a', 'b'])
        ).toBe('focus');
        expect(
            layoutFor({ view: 'leaderboard', focusMatchId: 'gone' }, ['a'])
        ).toBe('leaderboard');
    });

    it('shows the leaderboard next to a live match in auto, alone without one', () => {
        expect(layoutFor({ view: 'auto', focusMatchId: null }, ['a'])).toBe(
            'split'
        );
        expect(layoutFor({ view: 'auto', focusMatchId: null }, [])).toBe(
            'leaderboard'
        );
    });
});
