import {
    dehydrate,
    hydrate,
    MutationObserver,
    onlineManager,
    QueryClient,
} from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    CreatedMatch,
    createMatchKey,
    discardQueuedMatch,
    QueuedMatch,
    queuedMatchDto,
    registerMatchQueue,
    resumeQueuedMatches,
    shouldPersistMutation,
    shouldRetryCreateMatch,
    withQueuedMatches,
} from '@/api/calls/matchQueue';

const match = (id: string, seasonId = 's1'): QueuedMatch => ({
    id,
    groupId: 'g1',
    seasonId,
    enteredAt: '2026-10-05T20:00:00.000Z',
    teams: [
        {
            teamMembers: [
                { playerId: 'p1', moves: [{ moveId: 'finish', count: 1 }] },
            ],
        },
        { teamMembers: [{ playerId: 'p2', moves: [] }] },
    ],
});

const httpError = (status?: number) =>
    new AxiosError(
        'failed',
        undefined,
        undefined,
        undefined,
        status === undefined ? undefined : ({ status } as AxiosResponse)
    );

function setup(createMatch: (m: QueuedMatch) => Promise<CreatedMatch>) {
    const qc = new QueryClient();
    qc.mount();
    const deps = {
        createMatch: vi.fn(createMatch),
        onCreated: vi.fn(),
        onRejected: vi.fn(),
    };
    registerMatchQueue(qc, deps);
    return { qc, deps };
}

/** enters a match the way the new match screen does */
function enter(qc: QueryClient, m: QueuedMatch) {
    return new MutationObserver<CreatedMatch, unknown, QueuedMatch>(qc, {
        mutationKey: createMatchKey,
    })
        .mutate(m)
        .catch(() => undefined);
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const pending = (qc: QueryClient) =>
    qc.getMutationCache().findAll({ status: 'pending' });

afterEach(() => onlineManager.setOnline(true));

describe('withQueuedMatches', () => {
    it("adds the season's queued matches the server doesn't list, once", () => {
        const server = [queuedMatchDto(match('a'))];
        const queued = [
            match('a'), // the server has it now
            match('b'),
            match('b'), // queued twice
            match('c', 's2'), // another season
            undefined, // another group
        ];

        const { matches, queuedIds } = withQueuedMatches(server, queued, 's1');

        expect(matches.map((i) => i.id)).toEqual(['a', 'b']);
        expect([...queuedIds]).toEqual(['b']);
    });

    it('converts a queued match like the server lists it', () => {
        const dto = queuedMatchDto(match('a'));

        expect(dto.teams).toHaveLength(2);
        expect(dto.teamMembers.map((i) => i.playerId)).toEqual(['p1', 'p2']);
        expect(dto.matchMoves).toEqual([
            expect.objectContaining({ moveId: 'finish', value: 1 }),
        ]);
    });
});

describe('shouldRetryCreateMatch', () => {
    it('retries until it gets an answer, server errors a few times, never a rejection', () => {
        expect(shouldRetryCreateMatch(50, httpError())).toBe(true);
        expect(shouldRetryCreateMatch(1, httpError(503))).toBe(true);
        expect(shouldRetryCreateMatch(5, httpError(503))).toBe(false);
        expect(shouldRetryCreateMatch(0, httpError(400))).toBe(false);
        expect(shouldRetryCreateMatch(0, new Error('bug'))).toBe(false);
    });
});

describe('match queue', () => {
    it('keeps a match entered offline and sends it once back online', async () => {
        const { qc, deps } = setup(async () => null);
        onlineManager.setOnline(false);

        enter(qc, match('a'));
        await flush();

        expect(deps.createMatch).not.toHaveBeenCalled();
        expect(pending(qc)[0].state.isPaused).toBe(true);

        onlineManager.setOnline(true);
        await vi.waitFor(() => expect(deps.onCreated).toHaveBeenCalled());
        expect(deps.createMatch).toHaveBeenCalledTimes(1);
        expect(pending(qc)).toHaveLength(0);
    });

    it('sends the queued matches after a restart, in the order they were entered', async () => {
        const before = setup(async () => null);
        onlineManager.setOnline(false);
        enter(before.qc, match('a'));
        enter(before.qc, match('b'));
        await flush();
        const persisted = JSON.parse(
            JSON.stringify(
                dehydrate(before.qc, {
                    shouldDehydrateMutation: shouldPersistMutation,
                })
            )
        );

        onlineManager.setOnline(true);
        const after = setup(async () => null);
        hydrate(after.qc, persisted);
        await resumeQueuedMatches(after.qc);

        await vi.waitFor(() =>
            expect(after.deps.onCreated).toHaveBeenCalledTimes(2)
        );
        expect(after.deps.createMatch.mock.calls.map(([m]) => m.id)).toEqual([
            'a',
            'b',
        ]);
    });

    it('sends a match again that was in flight when the app was killed', async () => {
        const before = setup(() => new Promise<CreatedMatch>(() => {}));
        enter(before.qc, match('a'));
        await flush();
        expect(before.deps.createMatch).toHaveBeenCalled();
        const persisted = dehydrate(before.qc, {
            shouldDehydrateMutation: shouldPersistMutation,
        });

        const after = setup(async () => null);
        hydrate(after.qc, persisted);
        await resumeQueuedMatches(after.qc);

        expect(after.deps.createMatch.mock.calls[0][0]).toEqual(match('a'));
        expect(after.deps.onCreated).toHaveBeenCalled();
    });

    it("tells about a match the server won't take and drops it", async () => {
        const { qc, deps } = setup(() => Promise.reject(httpError(400)));

        await enter(qc, match('a'));

        expect(deps.createMatch).toHaveBeenCalledTimes(1);
        expect(deps.onRejected).toHaveBeenCalledWith(
            match('a'),
            expect.any(AxiosError)
        );
        expect(pending(qc)).toHaveLength(0);
    });

    it('discards a queued match that was not sent', async () => {
        const { qc, deps } = setup(async () => null);
        onlineManager.setOnline(false);
        enter(qc, match('a'));
        await flush();

        expect(discardQueuedMatch(qc, 'a')).toBe(true);
        onlineManager.setOnline(true);
        await flush();

        expect(pending(qc)).toHaveLength(0);
        expect(deps.createMatch).not.toHaveBeenCalled();
    });
});
