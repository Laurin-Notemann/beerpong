import { describe, expect, it } from 'vitest';

import {
    asLiveMatch,
    asLiveMatchList,
    asOpsEvent,
    isEnded,
    isIncomplete,
    mergeFetchedList,
    mergeLiveMatch,
    upsertInList,
    withEnd,
    withOps,
} from '@/lib/liveMatch/cache';
import type { LiveMatchDto, LiveMatchOpDto } from '@/lib/liveMatch/types';

const op = (seq: number, id = `op${seq}`): LiveMatchOpDto => ({
    id,
    seq,
    type: 'ADJUST_MOVE',
    playerId: 'anna',
    moveId: 'n',
    delta: 1,
});
const live = (
    id: string,
    seqs: number[],
    extra: Partial<LiveMatchDto> = {}
): LiveMatchDto => ({
    id,
    status: 'IN_PROGRESS',
    lastSeq: Math.max(0, ...seqs),
    ops: seqs.map((i) => op(i)),
    ...extra,
});
const seqs = (match: LiveMatchDto) => match.ops?.map((i) => i.seq);

describe('withOps', () => {
    it('merges by seq, ignoring ops it already has', () => {
        const next = withOps(live('m', [1, 2]), {
            liveMatchId: 'm',
            lastSeq: 4,
            ops: [op(2), op(4), op(3)],
        });

        expect(seqs(next)).toEqual([1, 2, 3, 4]);
        expect(next.lastSeq).toBe(4);
        expect(isIncomplete(next)).toBe(false);
    });

    it('flags a missed event as a gap', () => {
        const next = withOps(live('m', [1, 2]), {
            liveMatchId: 'm',
            lastSeq: 4,
            ops: [op(4)],
        });

        expect(seqs(next)).toEqual([1, 2, 4]);
        expect(isIncomplete(next)).toBe(true);
    });

    it('flags missing ops at the end that the server reports', () => {
        // the append response for my op at seq 3 says the log already has 5
        const next = withOps(live('m', [1, 2]), {
            liveMatchId: 'm',
            lastSeq: 5,
            ops: [op(3)],
        });

        expect(isIncomplete(next)).toBe(true);
    });
});

describe('mergeLiveMatch', () => {
    it('keeps ops that arrived by socket while a fetch was in flight', () => {
        const cached = live('m', [1, 2, 3]);
        const fetched = live('m', [1, 2], { lastActivityAt: 'later' });

        const next = mergeLiveMatch(cached, fetched);
        expect(seqs(next)).toEqual([1, 2, 3]);
        expect(next.lastSeq).toBe(3);
        expect(next.lastActivityAt).toBe('later');
    });

    it('keeps an ended match ended when an older in-progress copy arrives', () => {
        const ended = live('m', [1], {
            status: 'FINISHED',
            resultMatchId: 'x',
        });

        const next = mergeLiveMatch(ended, live('m', [1, 2]));
        expect(next.status).toBe('FINISHED');
        expect(next.resultMatchId).toBe('x');
        expect(seqs(next)).toEqual([1, 2]);
    });

    it('sorts the ops of a fresh copy', () => {
        expect(
            seqs(mergeLiveMatch(undefined, { id: 'm', ops: [op(2), op(1)] }))
        ).toEqual([1, 2]);
    });
});

describe('withEnd', () => {
    it('takes the end state and keeps the cached ops', () => {
        const next = withEnd(live('m', [1, 2]), {
            id: 'm',
            status: 'ABANDONED',
            lastSeq: 2,
            ops: [],
        });

        expect(next.status).toBe('ABANDONED');
        expect(seqs(next)).toEqual([1, 2]);
    });

    it('records the end of a match that was never opened on this phone', () => {
        const next = withEnd(undefined, {
            id: 'm',
            status: 'FINISHED',
            ops: [],
        });

        expect(isEnded(next)).toBe(true);
        expect(next.ops).toEqual([]);
    });
});

describe('the list of matches in progress', () => {
    it('upserts a started match at the front and removes an ended one', () => {
        const list = [live('a', [1]), live('b', [1])];

        expect(upsertInList(list, live('c', [])).map((i) => i.id)).toEqual([
            'c',
            'a',
            'b',
        ]);
        expect(
            upsertInList(list, live('a', [1], { status: 'FINISHED' })).map(
                (i) => i.id
            )
        ).toEqual(['b']);
    });

    it('leaves out fetched matches the cache knows have ended, and keeps cached ops', () => {
        const next = mergeFetchedList(
            [live('a', [1, 2])],
            [live('a', [1]), live('ended', [1])],
            (id) => id === 'ended'
        );

        expect(next.map((i) => i.id)).toEqual(['a']);
        expect(seqs(next[0])).toEqual([1, 2]);
    });

    it('never takes an ended match from a fetch', () => {
        const next = mergeFetchedList(
            [],
            [live('a', [1]), live('done', [1], { status: 'FINISHED' })],
            () => false
        );

        expect(next.map((i) => i.id)).toEqual(['a']);
    });

    it('keeps out a match whose end arrived while the list fetch was in flight', () => {
        // the end event lands first, for a match this phone never opened
        const single = withEnd(undefined, { id: 'm', status: 'FINISHED' });
        // then the fetch that started before the end resolves, still showing it in progress
        const next = mergeFetchedList(
            [],
            [live('m', [1, 2])],
            (id) => id === single.id && isEnded(single)
        );

        expect(next).toEqual([]);
    });
});

describe('values persisted by an older app version', () => {
    it('are ignored when they are not live matches', () => {
        expect(asLiveMatch(undefined)).toBeUndefined();
        expect(asLiveMatch({ data: { id: 'm' } })).toBeUndefined();
        expect(asLiveMatchList({ data: [] })).toEqual([]);
        expect(asLiveMatchList([live('a', []), null, 'x'])).toHaveLength(1);
    });

    it('get a usable ops array', () => {
        expect(asLiveMatch({ id: 'm', ops: 'nope' })?.ops).toEqual([]);
        expect(asLiveMatch({ id: 'm', ops: [null, op(1)] })?.ops).toEqual([
            op(1),
        ]);
    });

    it('get dates without a zone id, which Date.parse cannot read', () => {
        const match = asLiveMatch({
            id: 'm',
            startedAt: '2026-10-04T18:15:30.123456Z[Etc/UTC]',
            lastActivityAt: '2026-10-04T20:15:30+02:00[Europe/Berlin]',
            endedAt: '2026-10-04T18:20:00Z',
        });

        expect(match?.startedAt).toBe('2026-10-04T18:15:30.123456Z');
        expect(Date.parse(match!.startedAt!)).toBe(
            Date.parse('2026-10-04T18:15:30.123Z')
        );
        expect(Date.parse(match!.lastActivityAt!)).toBe(
            Date.parse('2026-10-04T18:15:30Z')
        );
        expect(match?.endedAt).toBe('2026-10-04T18:20:00Z');
    });

    it('socket bodies without a live match id are ignored', () => {
        expect(asOpsEvent({ ops: [] })).toBeUndefined();
        expect(asOpsEvent({ liveMatchId: 'm' })).toEqual({
            liveMatchId: 'm',
            lastSeq: undefined,
            ops: [],
        });
    });
});
