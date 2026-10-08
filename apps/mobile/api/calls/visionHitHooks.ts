import {
    QueryClient,
    onlineManager,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';

import { apiErrorCode } from '@/api/utils/apiInterceptors';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import {
    VisionHitCreateDto,
    VisionHitDto,
    VisionHitFeedbackDto,
    VisionHitReplayDto,
} from '@/openapi/openapi';

const record = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object';
const finite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);
const date = (v: unknown): v is string =>
    typeof v === 'string' && Number.isFinite(Date.parse(v));
const point = (v: unknown) => record(v) && finite(v.x) && finite(v.y);

/** Persisted queries can predate the wire contract. Ignore incomplete old entries. */
export function isVisionHit(v: unknown): v is VisionHitDto {
    if (!record(v)) return false;
    const e = v.evidence;
    return (
        [
            'id',
            'groupId',
            'liveMatchId',
            'cameraId',
            'sessionId',
            'model',
        ].every((k) => typeof v[k] === 'string' && !!v[k]) &&
        date(v.createdAt) &&
        date(v.occurredAt) &&
        date(v.cameraOccurredAt) &&
        (v.team === 'red' || v.team === 'blue') &&
        finite(v.revision) &&
        Number.isInteger(v.revision) &&
        v.revision >= 0 &&
        typeof v.label === 'string' &&
        ['unreviewed', 'accepted', 'declined', 'uncertain'].includes(v.label) &&
        (v.cup == null ||
            (point(v.cup) &&
                record(v.cup) &&
                Number.isInteger(v.cup.x) &&
                Number.isInteger(v.cup.y))) &&
        point(v.imageCup) &&
        record(v.imageCup) &&
        finite(v.imageCup.radius) &&
        finite(v.confidence) &&
        v.confidence >= 0 &&
        v.confidence <= 1 &&
        record(e) &&
        finite(e.approachDistance) &&
        finite(e.rimDistance) &&
        finite(e.speed) &&
        finite(e.observations) &&
        typeof e.occluded === 'boolean' &&
        typeof e.exitObserved === 'boolean' &&
        (v.feedbackSource === null ||
            (typeof v.feedbackSource === 'string' &&
                ['player', 'human-review', 'ai-review'].includes(
                    v.feedbackSource
                ))) &&
        (v.reviewedAt === null || date(v.reviewedAt)) &&
        (v.reviewerModel == null || typeof v.reviewerModel === 'string') &&
        (v.reason == null || typeof v.reason === 'string')
    );
}
export const visionHitsOf = (v: unknown): VisionHitDto[] =>
    Array.isArray(v) ? v.filter(isVisionHit) : [];
export const visionHitsKey = (groupId: string) => [
    QK.group,
    groupId,
    QK.visionHits,
];
const hitKey = (groupId: string, id: string) => [
    ...visionHitsKey(groupId),
    'hit',
    id,
];
export const replayKey = (groupId: string, id: string) => [
    ...visionHitsKey(groupId),
    'replay',
    id,
];
export function invalidateVisionHits(qc: QueryClient, groupId?: string) {
    return groupId
        ? qc.invalidateQueries({ queryKey: visionHitsKey(groupId) })
        : qc.invalidateQueries({
              predicate: (q) => q.queryKey.includes(QK.visionHits),
          });
}
export const visionHitNotFound = (err: unknown) =>
    isAxiosError(err) &&
    err.response?.status === 404 &&
    apiErrorCode(err) === 'visionHitNotFound';

/** Null is a persisted terminal state, including for mounted query observers. */
function removeVisionHit(qc: QueryClient, groupId: string, id: string) {
    // Cancel old responses before clearing the cache so they cannot restore the hit.
    void qc.cancelQueries({ queryKey: visionHitsKey(groupId) });
    qc.setQueryData(hitKey(groupId, id), null);
    qc.setQueryData(replayKey(groupId, id), null);
    const remove = (previous: unknown) =>
        visionHitsOf(previous).filter((hit) => hit.id !== id);
    qc.setQueriesData<unknown>(
        { queryKey: [...visionHitsKey(groupId), 'list'] },
        remove
    );
    qc.setQueriesData<unknown>(
        { queryKey: [...visionHitsKey(groupId), 'review'] },
        (previous: unknown) => {
            if (!record(previous) || !Array.isArray(previous.pages))
                return previous;
            return { ...previous, pages: previous.pages.map(remove) };
        }
    );
}
export function applyVisionHitEvent(
    qc: QueryClient,
    groupId: string,
    scope: string,
    body: unknown
) {
    if (
        scope === 'visionHitDeleted' &&
        record(body) &&
        typeof body.id === 'string'
    )
        removeVisionHit(qc, groupId, body.id);
    void invalidateVisionHits(qc, groupId);
}
/** A successful server response updates visible feedback immediately, then lists reconcile. */
function cacheVisionHit(qc: QueryClient, hit: VisionHitDto) {
    if (qc.getQueryData(hitKey(hit.groupId, hit.id)) === null) return;
    const replace = (previous: unknown) =>
        visionHitsOf(previous).map((i) =>
            i.id === hit.id && i.revision <= hit.revision ? hit : i
        );
    qc.setQueryData<VisionHitDto>(hitKey(hit.groupId, hit.id), (previous) =>
        !isVisionHit(previous) || previous.revision <= hit.revision
            ? hit
            : previous
    );
    qc.setQueriesData<unknown>(
        { queryKey: [...visionHitsKey(hit.groupId), 'list'] },
        replace
    );
    qc.setQueriesData<unknown>(
        { queryKey: [...visionHitsKey(hit.groupId), 'review'] },
        (previous: unknown) => {
            if (!record(previous) || !Array.isArray(previous.pages))
                return previous;
            return { ...previous, pages: previous.pages.map(replace) };
        }
    );
}
export function useVisionHits(
    groupId: string | null,
    liveMatchId?: string,
    enabled = true
) {
    const { api } = useApi();
    return useQuery({
        queryKey: [
            ...visionHitsKey(groupId ?? ''),
            'list',
            liveMatchId ?? 'all',
        ],
        enabled: !!groupId && enabled,
        queryFn: async () =>
            visionHitsOf(
                (
                    await (
                        await api
                    ).getVisionHits({
                        groupId: groupId!,
                        liveMatchId,
                        limit: 50,
                    })
                ).data.data
            ),
        select: visionHitsOf,
        // Failed refreshes use the app error surface; avoid repeating it while offline.
        refetchInterval: () => (onlineManager.isOnline() ? 5000 : false),
        staleTime: 0,
    });
}
export function useCurrentVisionSuggestion(
    groupId: string | null,
    liveMatchId: string,
    enabled: boolean
) {
    const query = useVisionHits(groupId, liveMatchId, enabled);
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        if (!enabled) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [enabled]);
    const hit = query.data?.find(
        (h) =>
            h.groupId === groupId &&
            h.liveMatchId === liveMatchId &&
            h.label === 'unreviewed' &&
            now - Date.parse(h.createdAt) < 30000
    );
    return { ...query, hit };
}
export function useVisionReview(groupId: string | null, reviewOnly: boolean) {
    const { api } = useApi();
    return useInfiniteQuery({
        queryKey: [...visionHitsKey(groupId ?? ''), 'review', reviewOnly],
        enabled: !!groupId,
        initialPageParam: undefined as string | undefined,
        queryFn: async ({ pageParam }) =>
            visionHitsOf(
                (
                    await (
                        await api
                    ).getVisionHits({
                        groupId: groupId!,
                        review: reviewOnly,
                        limit: 50,
                        before: pageParam,
                    })
                ).data.data
            ),
        getNextPageParam: (page) => {
            const hits = visionHitsOf(page);
            const last = hits.at(-1);
            return hits.length === 50 && last
                ? `${last.createdAt}|${last.id}`
                : undefined;
        },
        refetchInterval: () => (onlineManager.isOnline() ? 15000 : false),
        staleTime: 0,
    });
}
export function useVisionHit(groupId: string, id: string) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useQuery({
        queryKey: hitKey(groupId, id),
        enabled: (q) => !!groupId && !!id && q.state.data !== null,
        queryFn: async () => {
            if (qc.getQueryData(hitKey(groupId, id)) === null) return null;
            try {
                const hit = (await (await api).getVisionHit({ groupId, id }))
                    .data.data;
                if (
                    !isVisionHit(hit) ||
                    hit.id !== id ||
                    hit.groupId !== groupId
                )
                    throw new Error('Invalid camera suggestion');
                return hit;
            } catch (err) {
                if (!visionHitNotFound(err)) throw err;
                removeVisionHit(qc, groupId, id);
                return null;
            }
        },
        select: (hit) =>
            hit === null
                ? null
                : isVisionHit(hit) && hit.id === id && hit.groupId === groupId
                  ? hit
                  : undefined,
        refetchInterval: (q) =>
            q.state.data !== null && onlineManager.isOnline() ? 15000 : false,
    });
}
export const visionConflict = (err: unknown) =>
    isAxiosError(err) && err.response?.status === 409;
export function useVisionFeedback(groupId: string) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            hit,
            label,
            source,
            reason = null,
        }: {
            hit: VisionHitDto;
            label: VisionHitFeedbackDto['label'];
            source: 'player' | 'human-review';
            reason?: VisionHitFeedbackDto['reason'];
        }) => {
            const updated = (
                await (
                    await api
                ).feedbackVisionHit(
                    { groupId, id: hit.id },
                    {
                        expectedRevision: hit.revision,
                        label,
                        source,
                        reviewerModel: null,
                        reason,
                    }
                )
            ).data.data;
            if (!isVisionHit(updated))
                throw new Error('Invalid camera feedback');
            return updated;
        },
        onSuccess: (hit) => {
            cacheVisionHit(qc, hit);
            void invalidateVisionHits(qc, groupId);
        },
        onError: (err, { hit }) => {
            if (visionHitNotFound(err)) removeVisionHit(qc, groupId, hit.id);
            captureMutationErr('visionFeedback')(err);
            void invalidateVisionHits(qc, groupId);
        },
    });
}
export function usePutVisionHit(groupId: string) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            hit,
        }: {
            id: string;
            hit: VisionHitCreateDto;
        }) => (await (await api).putVisionHit({ groupId, id }, hit)).data.data,
        onSuccess: () => {
            void invalidateVisionHits(qc, groupId);
        },
        onError: captureMutationErr('putVisionHit'),
    });
}
export function useDeleteVisionHit(groupId: string) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) =>
            (await api).deleteVisionHit({ groupId, id }),
        onSuccess: (_, id) => {
            removeVisionHit(qc, groupId, id);
            void invalidateVisionHits(qc, groupId);
        },
        onError: (err, id) => {
            if (visionHitNotFound(err)) removeVisionHit(qc, groupId, id);
            captureMutationErr('deleteVisionHit')(err);
        },
    });
}
export function isVisionReplay(v: unknown): v is VisionHitReplayDto {
    return (
        record(v) &&
        typeof v.id === 'string' &&
        date(v.from) &&
        date(v.to) &&
        typeof v.complete === 'boolean' &&
        Array.isArray(v.segments) &&
        v.segments.every(
            (s) =>
                record(s) &&
                typeof s.id === 'string' &&
                typeof s.url === 'string' &&
                /^https?:\/\//.test(s.url) &&
                date(s.startedAt) &&
                date(s.endedAt) &&
                finite(s.startSeconds) &&
                finite(s.endSeconds) &&
                s.startSeconds >= 0 &&
                s.endSeconds > s.startSeconds
        )
    );
}
export function useVisionReplay(
    groupId: string,
    id: string,
    waitingSince: number
) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useQuery({
        queryKey: replayKey(groupId, id),
        enabled: (q) => !!groupId && !!id && q.state.data !== null,
        staleTime: 0,
        queryFn: async () => {
            if (qc.getQueryData(replayKey(groupId, id)) === null) return null;
            try {
                const replay = (
                    await (await api).getVisionHitReplay({ groupId, id })
                ).data.data;
                if (!isVisionReplay(replay) || replay.id !== id)
                    throw new Error('Invalid replay');
                return replay;
            } catch (err) {
                if (!visionHitNotFound(err)) throw err;
                removeVisionHit(qc, groupId, id);
                return null;
            }
        },
        select: (r) =>
            r === null
                ? null
                : isVisionReplay(r) && r.id === id
                  ? r
                  : undefined,
        refetchInterval: (q) =>
            onlineManager.isOnline() &&
            q.state.data !== null &&
            !q.state.data?.complete &&
            Date.now() - waitingSince < 90000
                ? 3000
                : false,
    });
}
export function useRequestVisionReplay(groupId: string, id: string) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const replay = (
                await (await api).postVisionHitReplay({ groupId, id })
            ).data.data;
            if (!isVisionReplay(replay) || replay.id !== id)
                throw new Error('Invalid replay');
            return replay;
        },
        onSuccess: (r) => {
            if (qc.getQueryData(replayKey(groupId, id)) !== null)
                qc.setQueryData(replayKey(groupId, id), r);
        },
        onError: (err) => {
            if (visionHitNotFound(err)) removeVisionHit(qc, groupId, id);
            captureMutationErr('visionReplay')(err);
        },
    });
}
