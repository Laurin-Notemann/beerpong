import { describe, expect, it } from 'vitest';

import { foldLiveMatch } from '~/tv/lib/liveMatch';

const moves = [
    { id: 'normal', name: 'Normal', finishingMove: false, cups: 1 },
    { id: 'bouncer', name: 'Bouncer', finishingMove: false, cups: 2 },
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
        expect([blue.cups.filter((i) => i.up).length, red.cups.filter((i) => i.up).length]).toEqual(
            [9, 8]
        );
        expect(blue.playerIds).toEqual(['b1']);
    });
});

describe('a re-rack', () => {
    it('draws the team at the formation, hits included, like the phone that made it', () => {
        const pyramidLeft = [
            { x: 1, y: 2 },
            { x: 3, y: 2 },
            { x: 3, y: 6 },
        ];
        const { red } = foldLiveMatch(
            {
                ops: [
                    op(1, { type: 'SET_TEAMS', bluePlayerIds: ['b1'], redPlayerIds: ['r1'] }),
                    // seven hits leave red three cups
                    ...[
                        [0, 0],
                        [2, 0],
                        [4, 0],
                        [6, 0],
                        [5, 2],
                        [2, 4],
                        [4, 4],
                    ].map(([x, y], i) =>
                        op(2 + i, {
                            type: 'RECORD_CUP_HIT',
                            team: 'red',
                            playerId: 'b1',
                            moveId: 'normal',
                            cups: [{ x, y }],
                        })
                    ),
                    op(9, {
                        type: 'SET_RERACK',
                        team: 'red',
                        cups: pyramidLeft,
                        drawn: [
                            { x: 2, y: 0 },
                            { x: 4, y: 0 },
                            { x: 3, y: 2 },
                        ],
                    }),
                    // and one of them is hit after the re-rack
                    op(10, {
                        type: 'RECORD_CUP_HIT',
                        team: 'red',
                        playerId: 'b1',
                        moveId: 'normal',
                        cups: [{ x: 3, y: 6 }],
                    }),
                ],
            },
            moves
        );
        expect(red.cups).toEqual([
            { at: { x: 2, y: 0 }, up: true },
            { at: { x: 4, y: 0 }, up: true },
            { at: { x: 3, y: 2 }, up: false },
        ]);
    });
});
