import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    classifySyncError,
    createSyncEngine,
    MAX_OPS_PER_REQUEST,
    nextRequest,
    SyncDeps,
    SyncErrorKind,
} from '@/lib/liveMatch/sync';
import type { LiveOp } from '@/lib/liveMatch/types';
import { outbox, OutboxState } from '@/zustand/liveMatchOutboxStore';

const adjust = (id: string): LiveOp => ({
    id,
    type: 'ADJUST_MOVE',
    playerId: 'anna',
    moveId: 'n',
    delta: 1,
});
const match = { groupId: 'g', seasonId: 's', createdAt: '2026-10-04' };

function httpError(status?: number, code?: string) {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError(
        'request failed',
        status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK',
        config,
        {},
        status
            ? {
                  status,
                  statusText: '',
                  headers: {},
                  config,
                  data: { status: 'ERROR', error: { code } },
              }
            : undefined
    );
}

describe('nextRequest', () => {
    it('creates first, then sends ops in batches of 50', () => {
        const ops = Array.from({ length: 60 }, (_, i) => adjust(String(i)));

        expect(
            nextRequest({
                ...match,
                pendingCreate: { ops: [adjust('t')] },
                pendingOps: ops,
            })
        ).toEqual({ kind: 'create', ops: [adjust('t')] });

        const batch = nextRequest({ ...match, pendingOps: ops });
        expect(batch?.kind).toBe('ops');
        expect(batch?.ops).toHaveLength(MAX_OPS_PER_REQUEST);
        expect(batch?.ops[0].id).toBe('0');
    });

    it('has nothing to send for an empty entry', () => {
        expect(nextRequest({ ...match, pendingOps: [] })).toBeUndefined();
    });
});

describe('classifySyncError', () => {
    it.each<[string, unknown, SyncErrorKind]>([
        ['no response', httpError(), 'retry'],
        [
            'a server error (e.g. two first creates racing)',
            httpError(500),
            'retry',
        ],
        ['an ended match', httpError(409, 'liveMatchEnded'), 'ended'],
        ['a missing match', httpError(404, 'liveMatchNotFound'), 'ended'],
        ['invalid ops', httpError(400, 'liveMatchInvalidOps'), 'poison'],
        ['a full log', httpError(400, 'liveMatchTooManyOps'), 'poison'],
        ['anything else', httpError(403, 'groupNotFound'), 'other'],
        ['a non-http error', new Error('boom'), 'other'],
    ])('%s', (_, error, kind) => {
        expect(classifySyncError(error)).toBe(kind);
    });
});

describe('createSyncEngine', () => {
    let state: OutboxState;
    const apply = (next: Partial<OutboxState>) => {
        state = { ...state, ...next };
    };
    let responses: (() => Promise<unknown>)[];
    let sent: { kind: string; ids: string[] }[];
    let failed: { kind: SyncErrorKind; firstInARow: boolean }[];
    let ended: string[];
    let poisoned: string[][];

    function engine(overrides: Partial<SyncDeps> = {}) {
        return createSyncEngine({
            getEntry: (id) => state.entries[id],
            getEntryIds: () => Object.keys(state.entries),
            send: async (_id, _entry, request) => {
                sent.push({
                    kind: request.kind,
                    ids: request.ops.map((i) => i.id),
                });
                await responses.shift()?.();
            },
            onSent: (id, request) =>
                apply(
                    request.kind === 'create'
                        ? outbox.ackCreate(state, id)
                        : outbox.ackOps(
                              state,
                              id,
                              request.ops.map((i) => i.id)
                          )
                ),
            onEnded: (id) => {
                ended.push(id);
                apply(outbox.drop(state, id));
            },
            onPoison: (id, _entry, request) => {
                poisoned.push(request.ops.map((i) => i.id));
                apply(
                    request.kind === 'create'
                        ? outbox.drop(state, id)
                        : outbox.ackOps(
                              state,
                              id,
                              request.ops.map((i) => i.id)
                          )
                );
            },
            onFailed: (_id, _error, kind, firstInARow) =>
                failed.push({ kind, firstInARow }),
            setFailing: (id, failing) =>
                apply(outbox.setFailing(state, id, failing)),
            timeouts: [1000, 2000],
            ...overrides,
        });
    }

    const reject = (error: unknown) => () => Promise.reject(error);

    beforeEach(() => {
        vi.useFakeTimers();
        state = {
            entries: {},
            lastOpenedLiveMatchId: {},
            myOpIds: [],
            failing: {},
        };
        responses = [];
        sent = [];
        failed = [];
        ended = [];
        poisoned = [];
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('creates, then sends the ops queued meanwhile, then is done', async () => {
        apply(outbox.start(state, 'm', match, [adjust('t')]));
        apply(outbox.enqueue(state, 'm', match, [adjust('a')]));

        engine().kick();
        await vi.runAllTimersAsync();

        expect(sent).toEqual([
            { kind: 'create', ids: ['t'] },
            { kind: 'ops', ids: ['a'] },
        ]);
        expect(state.entries).toEqual({});
    });

    it('keeps one request in flight per match, picking up ops queued during it', async () => {
        apply(outbox.enqueue(state, 'm', match, [adjust('a')]));
        let release!: () => void;
        responses.push(() => new Promise((resolve) => (release = resolve)));

        const sync = engine();
        sync.kick();
        apply(outbox.enqueue(state, 'm', match, [adjust('b')]));
        sync.kick(true);
        await vi.advanceTimersByTimeAsync(0);
        expect(sent).toHaveLength(1);

        release();
        await vi.runAllTimersAsync();
        expect(sent).toEqual([
            { kind: 'ops', ids: ['a'] },
            { kind: 'ops', ids: ['b'] },
        ]);
    });

    it('keeps the ops on a network error and retries with back-off', async () => {
        apply(outbox.enqueue(state, 'm', match, [adjust('a')]));
        responses.push(reject(httpError()), reject(httpError()));

        const sync = engine();
        sync.kick();
        await vi.advanceTimersByTimeAsync(0);
        expect(state.failing).toEqual({ m: true });
        expect(state.entries.m.pendingOps).toHaveLength(1);

        // a new op while waiting doesn't skip the back-off
        sync.kick();
        await vi.advanceTimersByTimeAsync(999);
        expect(sent).toHaveLength(1);

        await vi.advanceTimersByTimeAsync(1);
        expect(sent).toHaveLength(2);
        expect(failed).toEqual([
            { kind: 'retry', firstInARow: true },
            { kind: 'retry', firstInARow: false },
        ]);

        await vi.advanceTimersByTimeAsync(2000);
        expect(state.entries).toEqual({});
        expect(state.failing).toEqual({});
    });

    it('retries right away on foreground or reconnect', async () => {
        apply(outbox.enqueue(state, 'm', match, [adjust('a')]));
        responses.push(reject(httpError()));

        const sync = engine();
        sync.kick();
        await vi.advanceTimersByTimeAsync(0);

        sync.kick(true);
        await vi.advanceTimersByTimeAsync(0);
        expect(sent).toHaveLength(2);
        expect(state.entries).toEqual({});
    });

    it('drops what is queued for a match that ended', async () => {
        apply(outbox.enqueue(state, 'm', match, [adjust('a'), adjust('b')]));
        responses.push(reject(httpError(409, 'liveMatchEnded')));

        engine().kick();
        await vi.runAllTimersAsync();

        expect(ended).toEqual(['m']);
        expect(sent).toHaveLength(1);
        expect(state.entries).toEqual({});
    });

    it('drops a poison batch and goes on with the next one', async () => {
        const ops = Array.from({ length: 51 }, (_, i) => adjust(String(i)));
        apply(outbox.enqueue(state, 'm', match, ops));
        responses.push(reject(httpError(400, 'liveMatchInvalidOps')));

        engine().kick();
        await vi.runAllTimersAsync();

        expect(poisoned).toHaveLength(1);
        expect(poisoned[0]).toHaveLength(50);
        expect(sent.at(-1)).toEqual({ kind: 'ops', ids: ['50'] });
        expect(state.entries).toEqual({});
    });

    it('keeps the ops on other errors and reports only the first in a row', async () => {
        apply(outbox.enqueue(state, 'm', match, [adjust('a')]));
        responses.push(
            reject(httpError(403, 'forbidden')),
            reject(httpError(403, 'forbidden')),
            reject(httpError(403, 'forbidden'))
        );

        engine().kick();
        // attempts at 0, 1 s and 3 s; the next one would be at 5 s
        await vi.advanceTimersByTimeAsync(4999);

        expect(failed.map((i) => i.firstInARow)).toEqual([true, false, false]);
        expect(state.entries.m.pendingOps).toHaveLength(1);
    });

    it('sends nothing after stop', async () => {
        apply(outbox.enqueue(state, 'm', match, [adjust('a')]));
        responses.push(reject(httpError()));

        const sync = engine();
        sync.kick();
        await vi.advanceTimersByTimeAsync(0);
        sync.stop();
        await vi.runAllTimersAsync();

        expect(sent).toHaveLength(1);
    });
});
