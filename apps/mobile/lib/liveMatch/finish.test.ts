import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import {
    FinishDeps,
    finishWithRetry,
    LiveMatchScoreChangedError,
} from '@/lib/liveMatch/finish';
import type { LiveMatchDto } from '@/lib/liveMatch/types';

const live = (lastSeq: number): LiveMatchDto => ({
    id: 'm',
    status: 'IN_PROGRESS',
    lastSeq,
    ops: Array.from({ length: lastSeq }, (_, i) => ({
        id: `op${i + 1}`,
        seq: i + 1,
        type: 'ADJUST_MOVE',
        playerId: 'anna',
        moveId: 'n',
        delta: 1,
    })),
});
const finished: LiveMatchDto = {
    id: 'm',
    status: 'FINISHED',
    resultMatchId: 'match',
};

function serverError(code: string) {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError(
        'request failed',
        'ERR_BAD_REQUEST',
        config,
        {},
        {
            status: 409,
            statusText: '',
            headers: {},
            config,
            data: { status: 'ERROR', error: { code } },
        }
    );
}

/** `send` answers with the given results in order; it records the expected seq of each call */
function deps(
    results: (LiveMatchDto | Error)[],
    overrides: Partial<FinishDeps> = {}
) {
    const expectedSeqs: number[] = [];
    const refetched: LiveMatchDto[] = [live(3), live(4)];
    const all = {
        cached: live(2),
        refetch: vi.fn(async () => refetched.shift()!),
        send: vi.fn(async (server: LiveMatchDto) => {
            expectedSeqs.push(server.lastSeq ?? 0);
            const result = results.shift()!;
            if (result instanceof Error) throw result;
            return result;
        }),
        countFinishes: () => 1,
        onEnded: vi.fn(),
        ...overrides,
    };
    return { deps: all, expectedSeqs };
}

describe('finishWithRetry', () => {
    it('finishes with the cached log', async () => {
        const { deps: d, expectedSeqs } = deps([finished]);

        await expect(finishWithRetry(d)).resolves.toBe(finished);
        expect(expectedSeqs).toEqual([2]);
        expect(d.refetch).not.toHaveBeenCalled();
    });

    it('refetches a cached log with holes before sending', async () => {
        const { deps: d, expectedSeqs } = deps([finished], {
            cached: { ...live(2), lastSeq: 5 },
        });

        await finishWithRetry(d);
        expect(expectedSeqs).toEqual([3]);
    });

    it('retries once with the edits made meanwhile', async () => {
        const { deps: d, expectedSeqs } = deps([
            serverError('liveMatchStale'),
            finished,
        ]);

        await expect(finishWithRetry(d)).resolves.toBe(finished);
        expect(expectedSeqs).toEqual([2, 3]);
        expect(d.refetch).toHaveBeenCalledTimes(1);
    });

    it('gives up with "score changed" when it is stale twice', async () => {
        const { deps: d, expectedSeqs } = deps([
            serverError('liveMatchStale'),
            serverError('liveMatchStale'),
        ]);

        await expect(finishWithRetry(d)).rejects.toBeInstanceOf(
            LiveMatchScoreChangedError
        );
        expect(expectedSeqs).toEqual([2, 3]);
    });

    it('does not retry when the edits made meanwhile leave no single finish', async () => {
        const { deps: d, expectedSeqs } = deps(
            [serverError('liveMatchStale'), finished],
            { countFinishes: () => 0 }
        );

        await expect(finishWithRetry(d)).rejects.toBeInstanceOf(
            LiveMatchScoreChangedError
        );
        expect(expectedSeqs).toEqual([2]);
    });

    it('lets the server decide while the rules are not loaded', async () => {
        const { deps: d } = deps([serverError('liveMatchStale'), finished], {
            countFinishes: () => undefined,
        });

        await expect(finishWithRetry(d)).resolves.toBe(finished);
    });

    it('passes other errors on, and reports a match that already ended', async () => {
        const ended = serverError('liveMatchEnded');
        const { deps: d } = deps([ended]);

        await expect(finishWithRetry(d)).rejects.toBe(ended);
        expect(d.onEnded).toHaveBeenCalledTimes(1);
        expect(d.send).toHaveBeenCalledTimes(1);
    });
});
