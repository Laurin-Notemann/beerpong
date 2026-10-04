import { describe, expect, it } from 'vitest';

import {
    composeOps,
    countFinishes,
    formatElapsed,
    hasGap,
    mergeOps,
    splitDelta,
    teamScore,
    toTeamCreateDtos,
} from '@/lib/liveMatch/log';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import type { LiveOp } from '@/lib/liveMatch/types';

const adjust = (id: string, seq?: number): LiveOp => ({
    id,
    seq,
    type: 'ADJUST_MOVE',
    playerId: 'anna',
    moveId: 'n',
    delta: 1,
});

describe('mergeOps', () => {
    it('dedupes by seq and sorts', () => {
        const merged = mergeOps(
            [adjust('a', 1), adjust('c', 3)],
            [adjust('b', 2), adjust('c', 3), adjust('a', 1)]
        );

        expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    });

    it('keeps the confirmed version of a seq', () => {
        expect(
            mergeOps([adjust('a', 1)], [adjust('other', 1)]).map((i) => i.id)
        ).toEqual(['a']);
    });
});

describe('hasGap', () => {
    it('is false for 1..n and the empty log', () => {
        expect(hasGap([])).toBe(false);
        expect(hasGap([adjust('a', 1), adjust('b', 2)])).toBe(false);
    });

    it('is true if a seq is missing or the log does not start at 1', () => {
        expect(hasGap([adjust('a', 1), adjust('c', 3)])).toBe(true);
        expect(hasGap([adjust('b', 2)])).toBe(true);
    });
});

describe('composeOps', () => {
    it('appends pending ops in order and drops the ones already confirmed', () => {
        const composed = composeOps(
            [adjust('a', 1), adjust('b', 2)],
            [adjust('b'), adjust('c'), adjust('d')]
        );

        expect(composed.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    });
});

describe('toTeamCreateDtos and teamScore', () => {
    const { state } = reduceLiveMatch([
        {
            id: '1',
            seq: 1,
            type: 'SET_TEAMS',
            redPlayerIds: ['anna'],
            bluePlayerIds: ['carl'],
        },
        { ...adjust('2', 2), playerId: 'anna', moveId: 'normal', delta: 3 },
        { ...adjust('3', 3), playerId: 'anna', moveId: 'bouncer', delta: 1 },
        { ...adjust('4', 4), playerId: 'anna', moveId: 'save', delta: 1 },
        { ...adjust('5', 5), playerId: 'anna', moveId: 'save', delta: -1 },
    ]);

    it('puts blue first and leaves zero counts out', () => {
        expect(toTeamCreateDtos(state)).toEqual([
            { teamMembers: [{ playerId: 'carl', moves: [] }] },
            {
                teamMembers: [
                    {
                        playerId: 'anna',
                        moves: [
                            { moveId: 'normal', count: 3 },
                            { moveId: 'bouncer', count: 1 },
                        ],
                    },
                ],
            },
        ]);
    });

    it('scores the cups a team took', () => {
        const moves = [
            { id: 'normal', cups: 1 },
            { id: 'bouncer', cups: 2 },
            { id: 'save', cups: 0 },
        ];

        expect(teamScore(state, 'red', moves)).toBe(5);
        expect(teamScore(state, 'blue', moves)).toBe(0);
    });
});

describe('formatElapsed', () => {
    it('formats m:ss and h:mm:ss', () => {
        expect(formatElapsed(0)).toBe('0:00');
        expect(formatElapsed(59_000)).toBe('0:59');
        expect(formatElapsed(61_000)).toBe('1:01');
        expect(formatElapsed(3_600_000)).toBe('1:00:00');
        expect(formatElapsed(3_725_000)).toBe('1:02:05');
    });

    it('treats negative time as 0', () => {
        expect(formatElapsed(-5000)).toBe('0:00');
    });
});

describe('countFinishes', () => {
    it('sums the finish moves of both teams', () => {
        const state = {
            redTeam: {
                teamMembers: [
                    {
                        playerId: 'anna',
                        moves: [
                            { moveId: 'finish', count: 1 },
                            { moveId: 'n', count: 3 },
                        ],
                    },
                ],
            },
            blueTeam: {
                teamMembers: [
                    { playerId: 'ben', moves: [{ moveId: 'ring', count: 1 }] },
                ],
            },
            cupHits: [],
        };

        expect(countFinishes(state, new Set(['finish', 'ring']))).toBe(2);
        expect(countFinishes(state, new Set(['finish']))).toBe(1);
    });
});

describe('splitDelta', () => {
    it('splits into steps the server accepts', () => {
        expect(splitDelta(3)).toEqual([3]);
        expect(splitDelta(-45)).toEqual([-20, -20, -5]);
        expect(splitDelta(40)).toEqual([20, 20]);
        expect(splitDelta(0)).toEqual([]);
    });
});
