import { QueryClient } from '@tanstack/react-query';

import { ApiId } from '@/api/types';
import { QK } from '@/api/utils/reactQuery';
import {
    asLiveMatch,
    asLiveMatchList,
    asOpsEvent,
    isEnded,
    isIncomplete,
    LiveMatchOpsEvent,
    mergeLiveMatch,
    removeFromList,
    updateInList,
    upsertInList,
    withEnd,
    withOps,
} from '@/lib/liveMatch/cache';
import type { LiveMatchDto } from '@/lib/liveMatch/types';
import { ScopedLogger } from '@/utils/logging';
import { liveMatchOutbox } from '@/zustand/liveMatchOutboxStore';

const logger = new ScopedLogger('live-match');

export const liveMatchesKey = (groupId: ApiId) => [
    QK.group,
    groupId,
    QK.liveMatches,
];
export const liveMatchKey = (groupId: ApiId, id: ApiId) => [
    QK.group,
    groupId,
    QK.liveMatch,
    id,
];

/** whether a query is one of the live match queries, of any group */
export const isLiveMatchQuery = (query: { queryKey: readonly unknown[] }) =>
    query.queryKey[0] === QK.group &&
    (query.queryKey[2] === QK.liveMatches ||
        query.queryKey[2] === QK.liveMatch);

export const cachedList = (qc: QueryClient, groupId: ApiId) =>
    asLiveMatchList(qc.getQueryData(liveMatchesKey(groupId)));

export const cachedMatch = (qc: QueryClient, groupId: ApiId, id: ApiId) =>
    asLiveMatch(qc.getQueryData(liveMatchKey(groupId, id)));

// --- cache writers ----------------------------------------------------------------------
// Socket events and the sync's responses go through these, so both caches stay consistent.

export function invalidateLiveMatch(
    qc: QueryClient,
    groupId: ApiId,
    id: ApiId
) {
    qc.invalidateQueries({ queryKey: liveMatchKey(groupId, id), exact: true });
    qc.invalidateQueries({ queryKey: liveMatchesKey(groupId), exact: true });
}

/** a started match, or the full match a create or fetch returned */
export function applyLiveMatchStart(
    qc: QueryClient,
    groupId: ApiId,
    match: LiveMatchDto
) {
    if (!match.id) return;

    if (isEnded(match)) {
        applyLiveMatchEnd(qc, groupId, match);
        return;
    }
    qc.setQueryData(liveMatchKey(groupId, match.id), (prev: unknown) =>
        mergeLiveMatch(asLiveMatch(prev), match)
    );
    qc.setQueryData(liveMatchesKey(groupId), (prev: unknown) =>
        prev === undefined
            ? undefined
            : upsertInList(asLiveMatchList(prev), match)
    );
}

/** new ops; a gap in the log means an event was missed, so the match is refetched */
export function applyLiveMatchOps(
    qc: QueryClient,
    groupId: ApiId,
    event: LiveMatchOpsEvent
) {
    const id = event.liveMatchId;
    let incomplete = false;

    const single = cachedMatch(qc, groupId, id);
    if (single) {
        const next = withOps(single, event);
        incomplete ||= isIncomplete(next);
        qc.setQueryData(liveMatchKey(groupId, id), next);
    }

    const list = qc.getQueryData(liveMatchesKey(groupId));
    if (list !== undefined) {
        const matches = asLiveMatchList(list);
        const cached = matches.find((i) => i.id === id);

        if (cached) {
            const next = withOps(cached, event);
            incomplete ||= isIncomplete(next);
            qc.setQueryData(
                liveMatchesKey(groupId),
                updateInList(matches, id, () => next)
            );
        } else if (!isEnded(single)) {
            // the start event was missed
            incomplete = true;
        }
    }

    if (incomplete) {
        logger.info('live match log has a gap, refetching', id);
        invalidateLiveMatch(qc, groupId, id);
    }
}

/** a finished or abandoned match: out of the list, and whatever is still queued is moot */
export function applyLiveMatchEnd(
    qc: QueryClient,
    groupId: ApiId,
    match: LiveMatchDto
) {
    if (!match.id) return;
    const id = match.id;

    const single = cachedMatch(qc, groupId, id);
    if (single) {
        qc.setQueryData(liveMatchKey(groupId, id), withEnd(single, match));
    } else {
        qc.invalidateQueries({ queryKey: liveMatchKey(groupId, id) });
    }
    qc.setQueryData(liveMatchesKey(groupId), (prev: unknown) =>
        prev === undefined
            ? undefined
            : removeFromList(asLiveMatchList(prev), id)
    );
    liveMatchOutbox().actions.drop(id);
}

/** the `LIVE_MATCHES` socket event */
export function applyLiveMatchEvent(
    qc: QueryClient,
    groupId: ApiId,
    scope: string,
    body: unknown
) {
    switch (scope) {
        case 'liveMatchStart': {
            const match = asLiveMatch(body);
            if (match) applyLiveMatchStart(qc, groupId, match);
            break;
        }
        case 'liveMatchOps': {
            const event = asOpsEvent(body);
            if (event) applyLiveMatchOps(qc, groupId, event);
            break;
        }
        case 'liveMatchEnd': {
            const match = asLiveMatch(body);
            if (match) applyLiveMatchEnd(qc, groupId, match);
            break;
        }
    }
}

/** after the socket was down: the events it missed are lost, so refetch */
export const invalidateLiveMatches = (qc: QueryClient) =>
    qc.invalidateQueries({ predicate: isLiveMatchQuery });
