import { describe, expect, it } from 'vitest';

import type { LiveOp } from '@/lib/liveMatch/types';
import {
    MAX_MY_OP_IDS,
    mergeOutbox,
    outbox,
    OutboxState,
    restoreOutbox,
} from '@/zustand/liveMatchOutboxStore';

const empty: OutboxState = {
    entries: {},
    lastOpenedLiveMatchId: {},
    myOpIds: [],
    failing: {},
};
const match = { groupId: 'g', seasonId: 's', createdAt: '2026-10-04' };

const adjust = (id: string): LiveOp => ({
    id,
    type: 'ADJUST_MOVE',
    playerId: 'anna',
    moveId: 'n',
    delta: 1,
});
const teams = (id: string): LiveOp => ({
    id,
    type: 'SET_TEAMS',
    redPlayerIds: ['anna'],
    bluePlayerIds: ['ben'],
});

/** applies transitions in order, like the store's `set` does */
const run = (
    ...steps: ((s: OutboxState) => Partial<OutboxState>)[]
): OutboxState =>
    steps.reduce<OutboxState>((s, step) => ({ ...s, ...step(s) }), empty);

describe('outbox', () => {
    it('queues a pending create and remembers its ops as mine', () => {
        const state = run((s) => outbox.start(s, 'm', match, [teams('t')]));

        expect(state.entries.m).toEqual({
            ...match,
            pendingCreate: { ops: [teams('t')] },
            pendingOps: [],
        });
        expect(state.myOpIds).toEqual(['t']);
    });

    it('enqueues in order, creating the entry for a match the server already has', () => {
        const state = run(
            (s) => outbox.enqueue(s, 'm', match, [adjust('a')]),
            (s) => outbox.enqueue(s, 'm', match, [adjust('b'), adjust('c')])
        );

        expect(state.entries.m.pendingCreate).toBeUndefined();
        expect(state.entries.m.pendingOps.map((i) => i.id)).toEqual([
            'a',
            'b',
            'c',
        ]);
        expect(state.myOpIds).toEqual(['a', 'b', 'c']);
    });

    it('acks by op id, keeping ops queued meanwhile', () => {
        const state = run(
            (s) => outbox.enqueue(s, 'm', match, [adjust('a'), adjust('b')]),
            // 'c' was tapped while 'a' and 'b' were in flight
            (s) => outbox.enqueue(s, 'm', match, [adjust('c')]),
            (s) => outbox.ackOps(s, 'm', ['a', 'b'])
        );

        expect(state.entries.m.pendingOps.map((i) => i.id)).toEqual(['c']);
    });

    it('removes the entry once nothing is left to send, but keeps my op ids', () => {
        const state = run(
            (s) => outbox.start(s, 'm', match, [teams('t')]),
            (s) => outbox.enqueue(s, 'm', match, [adjust('a')]),
            (s) => outbox.ackCreate(s, 'm'),
            (s) => outbox.ackOps(s, 'm', ['a'])
        );

        expect(state.entries).toEqual({});
        expect(state.myOpIds).toEqual(['t', 'a']);
    });

    it('keeps the entry after create while ops are pending', () => {
        const state = run(
            (s) => outbox.start(s, 'm', match, [teams('t')]),
            (s) => outbox.enqueue(s, 'm', match, [adjust('a')]),
            (s) => outbox.ackCreate(s, 'm')
        );

        expect(state.entries.m.pendingCreate).toBeUndefined();
        expect(state.entries.m.pendingOps).toHaveLength(1);
    });

    it('drops a match with everything queued for it and its failing flag', () => {
        const state = run(
            (s) => outbox.enqueue(s, 'm', match, [adjust('a')]),
            (s) => outbox.enqueue(s, 'other', match, [adjust('b')]),
            (s) => outbox.setFailing(s, 'm', true),
            (s) => outbox.drop(s, 'm')
        );

        expect(Object.keys(state.entries)).toEqual(['other']);
        expect(state.failing).toEqual({});
    });

    it('does not mark a match without queued ops as failing', () => {
        expect(run((s) => outbox.setFailing(s, 'm', true)).failing).toEqual({});
    });

    it('bounds the remembered op ids, forgetting the oldest', () => {
        const ops = Array.from({ length: MAX_MY_OP_IDS + 10 }, (_, i) =>
            adjust(String(i))
        );
        const state = run((s) => outbox.enqueue(s, 'm', match, ops));

        expect(state.myOpIds).toHaveLength(MAX_MY_OP_IDS);
        expect(state.myOpIds[0]).toBe('10');
    });

    it('remembers the last opened match per group', () => {
        const state = run(
            (s) => outbox.setLastOpened(s, 'g1', 'a'),
            (s) => outbox.setLastOpened(s, 'g2', 'b'),
            (s) => outbox.setLastOpened(s, 'g1', 'c')
        );

        expect(state.lastOpenedLiveMatchId).toEqual({ g1: 'c', g2: 'b' });
    });
});

describe('restoreOutbox', () => {
    it('keeps a well-formed persisted outbox', () => {
        const persisted = {
            entries: {
                m: { ...match, pendingOps: [adjust('a')] },
                n: { ...match, pendingCreate: { ops: [] }, pendingOps: [] },
            },
            lastOpenedLiveMatchId: { g: 'm' },
            myOpIds: ['a'],
        };

        expect(restoreOutbox(persisted)).toEqual(persisted);
    });

    it('drops what has an unexpected shape instead of crashing', () => {
        expect(restoreOutbox('garbage')).toEqual({});
        expect(
            restoreOutbox({
                entries: {
                    noOps: { ...match },
                    badCreate: { ...match, pendingOps: [], pendingCreate: 1 },
                    ok: { ...match, pendingOps: [] },
                },
                lastOpenedLiveMatchId: { g: 5 },
                myOpIds: 'nope',
            })
        ).toEqual({
            entries: { ok: { ...match, pendingOps: [] } },
            lastOpenedLiveMatchId: {},
            myOpIds: [],
        });
    });
});

describe('outbox.abandon', () => {
    it('forgets a match whose create never went out', () => {
        const state = run(
            (s) => outbox.start(s, 'm', match, [teams('t')]),
            (s) => outbox.abandon(s, 'm', match)
        );

        expect(state.entries).toEqual({});
    });

    it('queues the discard once the create went out, dropping everything else', () => {
        const state = run(
            (s) => outbox.start(s, 'm', match, [teams('t')]),
            (s) => outbox.markCreateSent(s, 'm'),
            (s) => outbox.enqueue(s, 'm', match, [adjust('a')]),
            (s) => outbox.abandon(s, 'm', match)
        );

        expect(state.entries.m).toMatchObject({
            pendingAbandon: true,
            pendingCreate: undefined,
            pendingOps: [],
        });
    });

    it('queues the discard of a match the server has, without an entry yet', () => {
        const state = run((s) => outbox.abandon(s, 'm', match));

        expect(state.entries.m).toEqual({
            ...match,
            pendingOps: [],
            pendingCreate: undefined,
            pendingAbandon: true,
        });
    });

    it('takes no more edits and survives the late answer to its create', () => {
        const state = run(
            (s) => outbox.start(s, 'm', match, [teams('t')]),
            (s) => outbox.markCreateSent(s, 'm'),
            (s) => outbox.abandon(s, 'm', match),
            (s) => outbox.enqueue(s, 'm', match, [adjust('a')]),
            (s) => outbox.ackCreate(s, 'm')
        );

        expect(state.entries.m.pendingAbandon).toBe(true);
        expect(state.entries.m.pendingOps).toEqual([]);
    });
});

describe('mergeOutbox', () => {
    const current = (
        entries: OutboxState['entries'],
        myOpIds: string[] = []
    ) => ({
        ...empty,
        entries,
        myOpIds,
    });

    it('keeps edits made before the outbox was read from disk', () => {
        const merged = mergeOutbox(
            {
                entries: {
                    m: { ...match, pendingOps: [adjust('a'), adjust('b')] },
                    old: { ...match, pendingOps: [adjust('x')] },
                },
                myOpIds: ['a', 'b', 'x'],
            },
            current(
                {
                    m: { ...match, pendingOps: [adjust('b'), adjust('c')] },
                    fresh: {
                        ...match,
                        pendingCreate: { ops: [teams('t')] },
                        pendingOps: [],
                    },
                },
                ['b', 'c', 't']
            )
        );

        expect(merged.entries.m.pendingOps.map((i) => i.id)).toEqual([
            'a',
            'b',
            'c',
        ]);
        expect(Object.keys(merged.entries).sort()).toEqual([
            'fresh',
            'm',
            'old',
        ]);
        expect(merged.myOpIds).toEqual(['a', 'b', 'x', 'c', 't']);
    });

    it('keeps a discard from either side', () => {
        const merged = mergeOutbox(
            { entries: { m: { ...match, pendingOps: [adjust('a')] } } },
            current({ m: { ...match, pendingOps: [], pendingAbandon: true } })
        );

        expect(merged.entries.m).toMatchObject({
            pendingAbandon: true,
            pendingOps: [],
        });
    });

    it('takes the current state when nothing was persisted', () => {
        const now = current({ m: { ...match, pendingOps: [adjust('a')] } }, [
            'a',
        ]);

        expect(mergeOutbox({}, now)).toEqual(now);
    });
});
