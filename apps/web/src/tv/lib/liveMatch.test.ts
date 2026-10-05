import { describe, expect, it } from 'vitest';

import { foldLiveMatch } from '~/tv/lib/liveMatch';

const moves = [
    { id: 'normal', name: 'Normal', cups: 1 },
    { id: 'bouncer', name: 'Bouncer', cups: 2 },
];
const op = (seq: number, rest: Record<string, unknown>) =>
    ({ id: `op${seq}`, seq, ...rest }) as never;

describe('foldLiveMatch', () => {
    it('scores the cups each team took and keeps the rest standing', () => {
        const { blue, red } = foldLiveMatch(
            {
                ops: [
                    op(1, { type: 'SET_TEAMS', bluePlayerIds: ['b1'], redPlayerIds: ['r1'] }),
                    op(2, {
                        type: 'RECORD_CUP_HIT',
                        team: 'red',
                        playerId: 'b1',
                        moveId: 'bouncer',
                        cups: [
                            { x: 0, y: 0 },
                            { x: 2, y: 0 },
                        ],
                    }),
                    op(3, {
                        type: 'RECORD_CUP_HIT',
                        team: 'blue',
                        playerId: 'r1',
                        moveId: 'normal',
                        cups: [{ x: 3, y: 6 }],
                    }),
                    // the same cup again: the first hit in the log took it
                    op(4, {
                        type: 'RECORD_CUP_HIT',
                        team: 'blue',
                        playerId: 'r1',
                        moveId: 'normal',
                        cups: [{ x: 3, y: 6 }],
                    }),
                ],
            },
            moves
        );
        expect([blue.score, red.score]).toEqual([2, 1]);
        expect([blue.standing.length, red.standing.length]).toEqual([9, 8]);
        expect(blue.playerIds).toEqual(['b1']);
    });
});
