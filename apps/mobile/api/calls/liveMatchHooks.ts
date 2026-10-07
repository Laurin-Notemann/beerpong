import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
    cachedList,
    cachedMatch,
    liveMatchesKey,
    liveMatchKey,
    removeEndedFromList,
} from '@/api/liveMatch/liveMatchCache';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import {
    asLiveMatch,
    asLiveMatchList,
    isEnded,
    mergeFetchedList,
    mergeLiveMatch,
} from '@/lib/liveMatch/cache';
import { toLiveOpDto } from '@/lib/liveMatch/types';
import type { LiveOp } from '@/lib/liveMatch/types';
import type { Client, Components } from '@/openapi/openapi';
import { useLiveMatchOutboxStore } from '@/zustand/liveMatchOutboxStore';

// --- requests ---------------------------------------------------------------------------

/** the envelope's `data`, or an error if a successful response has none */
function unwrap<T>(
    res: { data?: { data?: T } } | null | undefined,
    what: string
): T {
    const data = res?.data?.data;
    if (data === undefined) throw new Error(`${what}: empty response`);
    return data;
}

export const fetchLiveMatches = async (api: Client, groupId: ApiId) =>
    unwrap(await api.getActiveLiveMatches({ groupId }), 'getActiveLiveMatches');

export const fetchLiveMatch = async (api: Client, groupId: ApiId, id: ApiId) =>
    unwrap(await api.getLiveMatch({ groupId, id }), 'getLiveMatch');

// Create, append and abandon are only sent by `useLiveMatchSync`, which retries them until
// they go through.
const syncRequest = { retriedUntilOnline: true };

/** idempotent: the server returns the existing match if it already has this id */
export const createLiveMatch = async (
    api: Client,
    groupId: ApiId,
    id: ApiId,
    seasonId: ApiId,
    ops: LiveOp[],
    tournamentId?: string
) =>
    unwrap(
        await api.createLiveMatch(
            { groupId, id },
            { seasonId, tournamentId, ops: ops.map(toLiveOpDto) },
            syncRequest
        ),
        'createLiveMatch'
    );

/** idempotent per op id */
export const appendLiveMatchOps = async (
    api: Client,
    groupId: ApiId,
    id: ApiId,
    ops: LiveOp[]
) =>
    unwrap(
        await api.appendOps(
            { groupId, id },
            { ops: ops.map(toLiveOpDto) },
            syncRequest
        ),
        'appendOps'
    );

export const finishLiveMatch = async (
    api: Client,
    groupId: ApiId,
    id: ApiId,
    body: Components.Schemas.LiveMatchFinishDto
) =>
    unwrap(await api.finishLiveMatch({ groupId, id }, body), 'finishLiveMatch');

export const abandonLiveMatch = async (
    api: Client,
    groupId: ApiId,
    id: ApiId
) =>
    unwrap(
        await api.abandonLiveMatch({ groupId, id }, null, syncRequest),
        'abandonLiveMatch'
    );

// --- queries ----------------------------------------------------------------------------

/** the group's live matches in progress, ops included; those discarded on this phone are left out */
export const useLiveMatchesQuery = (groupId: ApiId | null | undefined) => {
    const { api } = useApi();
    const qc = useQueryClient();
    const outbox = useLiveMatchOutboxStore((s) => s.entries);

    const select = useCallback(
        (data: unknown) =>
            asLiveMatchList(data).filter(
                (i) => !i.id || !outbox[i.id]?.pendingAbandon
            ),
        [outbox]
    );

    return useQuery({
        queryKey: liveMatchesKey(groupId ?? 'NULL'),
        enabled: !!groupId,
        queryFn: async () => {
            if (!groupId) return [];

            const fetched = await fetchLiveMatches(await api, groupId);
            return mergeFetchedList(cachedList(qc, groupId), fetched, (id) =>
                isEnded(cachedMatch(qc, groupId, id))
            );
        },
        select,
    });
};

/** one live match in any status, seeded from the list while it hasn't been fetched on its own */
export const useLiveMatchQuery = (
    groupId: ApiId | null | undefined,
    id: ApiId | null | undefined,
    options: { enabled?: boolean } = {}
) => {
    const { api } = useApi();
    const qc = useQueryClient();

    return useQuery({
        queryKey: liveMatchKey(groupId ?? 'NULL', id ?? 'NULL'),
        enabled: !!groupId && !!id && options.enabled !== false,
        queryFn: async () => {
            if (!groupId || !id) return null;

            const fetched = await fetchLiveMatch(await api, groupId, id);
            const merged = mergeLiveMatch(
                cachedMatch(qc, groupId, id),
                fetched
            );
            // its end event may have been missed, so it can still be in the list
            removeEndedFromList(qc, groupId, merged);
            return merged;
        },
        initialData: () =>
            groupId && id
                ? cachedList(qc, groupId).find((i) => i.id === id)
                : undefined,
        initialDataUpdatedAt: () =>
            groupId
                ? qc.getQueryState(liveMatchesKey(groupId))?.dataUpdatedAt
                : undefined,
        select: asLiveMatch,
    });
};
