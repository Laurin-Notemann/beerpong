import { beforeEach, describe, expect, it } from 'vitest';

import { standingCups } from '@/lib/cupHits';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { LiveOp, toLiveOp } from '@/lib/liveMatch/types';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

type OpBody = LiveOp extends infer T
    ? T extends LiveOp
        ? Omit<T, 'id' | 'seq'>
        : never
    : never;

let counter = 0;
/** the log as the server would number it */
const log = (...bodies: OpBody[]) =>
    bodies.map(
        (body, idx) =>
            ({ ...body, id: `op-${++counter}`, seq: idx + 1 }) as LiveOp
    );

const setTeams: OpBody = {
    type: 'SET_TEAMS',
    redPlayerIds: ['anna', 'ben'],
    bluePlayerIds: ['carl', 'dora'],
};

const countOf = (
    state: ReturnType<typeof reduceLiveMatch>['state'],
    playerId: string,
    moveId: string
) =>
    [...state.redTeam.teamMembers, ...state.blueTeam.teamMembers]
        .find((i) => i.playerId === playerId)
        ?.moves.find((i) => i.moveId === moveId)?.count ?? 0;

const hit = (
    team: 'red' | 'blue',
    playerId: string,
    moveId: string,
    cups: { x: number; y: number }[],
    finishMoveId?: string
): OpBody => ({
    type: 'RECORD_CUP_HIT',
    team,
    playerId,
    moveId,
    cups,
    finishMoveId,
});

describe('reduceLiveMatch', () => {
    it('SET_TEAMS replaces both teams', () => {
        const { state, ignoredOpIds } = reduceLiveMatch(log(setTeams));

        expect(state.redTeam.teamMembers.map((i) => i.playerId)).toEqual([
            'anna',
            'ben',
        ]);
        expect(state.blueTeam.teamMembers.map((i) => i.playerId)).toEqual([
            'carl',
            'dora',
        ]);
        expect(ignoredOpIds).toEqual([]);
    });

    it('SET_TEAMS keeps the moves of players who stay on their team', () => {
        const { state } = reduceLiveMatch(
            log(
                setTeams,
                {
                    type: 'ADJUST_MOVE',
                    playerId: 'anna',
                    moveId: 'n',
                    delta: 2,
                },
                {
                    type: 'ADJUST_MOVE',
                    playerId: 'carl',
                    moveId: 'n',
                    delta: 3,
                },
                {
                    type: 'SET_TEAMS',
                    // anna stays red, carl switches to red, ben and dora leave
                    redPlayerIds: ['anna', 'carl'],
                    bluePlayerIds: ['eve'],
                }
            )
        );

        expect(countOf(state, 'anna', 'n')).toBe(2);
        expect(countOf(state, 'carl', 'n')).toBe(0);
        expect(state.blueTeam.teamMembers).toEqual([
            { playerId: 'eve', moves: [] },
        ]);
    });

    it('SET_TEAMS drops hits whose scorer left', () => {
        const { state } = reduceLiveMatch(
            log(setTeams, hit('red', 'carl', 'n', [{ x: 0, y: 0 }]), {
                type: 'SET_TEAMS',
                redPlayerIds: ['anna', 'ben'],
                bluePlayerIds: ['dora'],
            })
        );

        expect(state.cupHits).toEqual([]);
    });

    it('SET_PLAYER_TEAM resets the moves and drops the hits of a player who switches', () => {
        const { state } = reduceLiveMatch(
            log(setTeams, hit('red', 'carl', 'n', [{ x: 0, y: 0 }]), {
                type: 'SET_PLAYER_TEAM',
                playerId: 'carl',
                team: 'red',
            })
        );

        expect(state.cupHits).toEqual([]);
        expect(countOf(state, 'carl', 'n')).toBe(0);
        expect(state.redTeam.teamMembers.map((i) => i.playerId)).toContain(
            'carl'
        );
        expect(state.blueTeam.teamMembers.map((i) => i.playerId)).toEqual([
            'dora',
        ]);
    });

    it('SET_PLAYER_TEAM with no team removes the player; an unknown one is ignored', () => {
        const ops = log(
            setTeams,
            { type: 'SET_PLAYER_TEAM', playerId: 'anna', team: null },
            { type: 'SET_PLAYER_TEAM', playerId: 'nobody', team: null }
        );
        const { state, ignoredOpIds } = reduceLiveMatch(ops);

        expect(state.redTeam.teamMembers.map((i) => i.playerId)).toEqual([
            'ben',
        ]);
        expect(ignoredOpIds).toEqual([ops[2].id]);
    });

    it('ADJUST_MOVE adds, clamps at 0 and ignores unknown players', () => {
        const ops = log(
            setTeams,
            { type: 'ADJUST_MOVE', playerId: 'anna', moveId: 'n', delta: 2 },
            { type: 'ADJUST_MOVE', playerId: 'anna', moveId: 'n', delta: -5 },
            { type: 'ADJUST_MOVE', playerId: 'nobody', moveId: 'n', delta: 1 }
        );
        const { state, ignoredOpIds } = reduceLiveMatch(ops);

        expect(countOf(state, 'anna', 'n')).toBe(0);
        expect(ignoredOpIds).toEqual([ops[3].id]);
    });

    it('ADJUST_MOVE drops the hits the count no longer covers', () => {
        const { state } = reduceLiveMatch(
            log(
                setTeams,
                hit('red', 'carl', 'n', [{ x: 3, y: 6 }]),
                hit('red', 'carl', 'n', [{ x: 2, y: 4 }]),
                {
                    type: 'ADJUST_MOVE',
                    playerId: 'carl',
                    moveId: 'n',
                    delta: -1,
                }
            )
        );

        expect(state.cupHits.map((i) => i.cups[0])).toEqual([{ x: 3, y: 6 }]);
        expect(countOf(state, 'carl', 'n')).toBe(1);
    });

    it('two deltas on the same move both count', () => {
        const { state } = reduceLiveMatch(
            log(
                setTeams,
                {
                    type: 'ADJUST_MOVE',
                    playerId: 'anna',
                    moveId: 'n',
                    delta: 1,
                },
                { type: 'ADJUST_MOVE', playerId: 'anna', moveId: 'n', delta: 1 }
            )
        );

        expect(countOf(state, 'anna', 'n')).toBe(2);
    });

    it('RECORD_CUP_HIT takes the cup and counts the move and finish', () => {
        const { state } = reduceLiveMatch(
            log(setTeams, hit('red', 'carl', 'n', [{ x: 3, y: 6 }]))
        );

        expect(countOf(state, 'carl', 'n')).toBe(1);
        expect(standingCups(state.cupHits, 'red')).toHaveLength(9);
    });

    it('a finish stands while its team has no cups left', () => {
        const cups = standingCups([], 'red');
        const ops = log(
            setTeams,
            ...cups.map((cup, idx) =>
                hit(
                    'red',
                    'carl',
                    'n',
                    [cup],
                    idx === cups.length - 1 ? 'fin' : undefined
                )
            )
        );
        const { state } = reduceLiveMatch(ops);

        expect(countOf(state, 'carl', 'fin')).toBe(1);

        // taking back one cup means the match isn't finished any more
        const undone = reduceLiveMatch([
            ...ops,
            ...log({ type: 'UNDO_CUP_HIT', team: 'red', cup: cups[0] }).map(
                (i) => ({ ...i, seq: ops.length + 1 })
            ),
        ]);
        expect(countOf(undone.state, 'carl', 'fin')).toBe(0);
    });

    it('RECORD_CUP_HIT: the first hit on a cup wins, whoever sent it', () => {
        const ops = log(
            setTeams,
            hit('red', 'carl', 'n', [{ x: 3, y: 6 }]),
            hit('red', 'dora', 'n', [{ x: 3, y: 6 }])
        );
        const { state, ignoredOpIds } = reduceLiveMatch(ops);

        expect(ignoredOpIds).toEqual([ops[2].id]);
        expect(state.cupHits).toHaveLength(1);
        expect(countOf(state, 'carl', 'n')).toBe(1);
        expect(countOf(state, 'dora', 'n')).toBe(0);
    });

    it('RECORD_CUP_HIT is ignored if the scorer is on the hit team or unknown', () => {
        const ops = log(
            setTeams,
            hit('red', 'anna', 'n', [{ x: 3, y: 6 }]),
            hit('red', 'nobody', 'n', [{ x: 3, y: 6 }])
        );
        const { state, ignoredOpIds } = reduceLiveMatch(ops);

        expect(ignoredOpIds).toEqual([ops[1].id, ops[2].id]);
        expect(state.cupHits).toEqual([]);
    });

    it('a bouncer takes two cups and undoing either restores both', () => {
        const ops = log(
            setTeams,
            hit('red', 'carl', 'bouncer', [
                { x: 3, y: 6 },
                { x: 2, y: 4 },
            ])
        );
        expect(
            standingCups(reduceLiveMatch(ops).state.cupHits, 'red')
        ).toHaveLength(8);

        const undone = reduceLiveMatch([
            ...ops,
            ...log({
                type: 'UNDO_CUP_HIT',
                team: 'red',
                cup: { x: 2, y: 4 },
            }).map((i) => ({ ...i, seq: 3 })),
        ]);
        expect(standingCups(undone.state.cupHits, 'red')).toHaveLength(10);
        expect(countOf(undone.state, 'carl', 'bouncer')).toBe(0);
    });

    it('UNDO_CUP_HIT is ignored if no hit took that cup', () => {
        const ops = log(setTeams, {
            type: 'UNDO_CUP_HIT',
            team: 'red',
            cup: { x: 0, y: 0 },
        });

        expect(reduceLiveMatch(ops).ignoredOpIds).toEqual([ops[1].id]);
    });
});

describe('same results as the match draft store', () => {
    const draft = () => useMatchDraftStore.getState();

    beforeEach(() => {
        draft().actions.clear();
        draft().actions.setTeams(
            [{ id: 'anna' }, { id: 'ben' }],
            [{ id: 'carl' }, { id: 'dora' }]
        );
    });

    it('for a mixed sequence of edits', () => {
        const a = draft().actions;
        const cups = standingCups([], 'red');

        a.recordCupHit({
            team: 'red',
            playerId: 'carl',
            moveId: 'n',
            cups: [cups[0]],
        });
        a.recordCupHit({
            team: 'red',
            playerId: 'dora',
            moveId: 'b',
            cups: [cups[1], cups[2]],
        });
        a.setMoveCount('carl', 'n', 4);
        a.setMoveCount('dora', 'b', 0);
        a.setPlayerTeam('ben', 'blue');
        a.recordCupHit({
            team: 'red',
            playerId: 'ben',
            moveId: 'n',
            cups: [cups[3]],
        });
        a.undoCupHit('red', cups[0]);
        a.setPlayerTeam('carl', 'red');

        const { state } = reduceLiveMatch(
            log(
                setTeams,
                hit('red', 'carl', 'n', [cups[0]]),
                hit('red', 'dora', 'b', [cups[1], cups[2]]),
                {
                    type: 'ADJUST_MOVE',
                    playerId: 'carl',
                    moveId: 'n',
                    delta: 3,
                },
                {
                    type: 'ADJUST_MOVE',
                    playerId: 'dora',
                    moveId: 'b',
                    delta: -1,
                },
                { type: 'SET_PLAYER_TEAM', playerId: 'ben', team: 'blue' },
                hit('red', 'ben', 'n', [cups[3]]),
                { type: 'UNDO_CUP_HIT', team: 'red', cup: cups[0] },
                { type: 'SET_PLAYER_TEAM', playerId: 'carl', team: 'red' }
            )
        );

        expect(state.redTeam).toEqual(draft().redTeam);
        expect(state.blueTeam).toEqual(draft().blueTeam);
        expect(state.cupHits).toEqual(draft().cupHits);
    });
});

describe('toLiveOp', () => {
    it('turns a well-formed dto into an op', () => {
        expect(
            toLiveOp({
                id: 'a',
                seq: 3,
                type: 'UNDO_CUP_HIT',
                team: 'red',
                cup: { x: 1, y: 2 },
            })
        ).toEqual({
            id: 'a',
            seq: 3,
            type: 'UNDO_CUP_HIT',
            team: 'red',
            cup: { x: 1, y: 2 },
        });
    });

    it('drops malformed ops', () => {
        expect(toLiveOp({ id: 'a', type: 'ADJUST_MOVE' })).toBeUndefined();
        expect(
            toLiveOp({ id: 'a', type: 'RECORD_CUP_HIT', team: 'green' })
        ).toBeUndefined();
        expect(
            toLiveOp({ type: 'SET_TEAMS', redPlayerIds: [], bluePlayerIds: [] })
        ).toBeUndefined();
    });
});

describe('SET_RERACK', () => {
    const rerack: OpBody = {
        type: 'SET_RERACK',
        team: 'red',
        formationId: 'tri-6',
        cups: [
            { x: 1, y: 2 },
            { x: 3, y: 2 },
        ],
        drawn: [
            { x: 2, y: 0 },
            { x: 3, y: 1 },
        ],
    };

    it('draws the team in the formation, on every phone, and keeps it through later ops', () => {
        const { state } = reduceLiveMatch(
            log(
                setTeams,
                rerack,
                hit('blue', 'anna', 'normal', [{ x: 0, y: 0 }])
            )
        );
        expect(state.reracks.red).toEqual({
            formationId: 'tri-6',
            slots: [
                { cup: { x: 1, y: 2 }, drawn: { x: 2, y: 0 } },
                { cup: { x: 3, y: 2 }, drawn: { x: 3, y: 1 } },
            ],
        });
        expect(state.reracks.blue).toBeUndefined();
    });

    it('puts the cups back in the pyramid when sent without cups', () => {
        const { state } = reduceLiveMatch(
            log(setTeams, rerack, {
                type: 'SET_RERACK',
                team: 'red',
                cups: [],
                drawn: [],
            })
        );
        expect(state.reracks.red).toBeUndefined();
    });

    it('drops an op whose cups and drawn positions do not pair up', () => {
        expect(
            toLiveOp({
                id: 'x',
                type: 'SET_RERACK',
                team: 'red',
                cups: [{ x: 1, y: 2 }],
                drawn: [],
            })
        ).toBeUndefined();
    });
});
