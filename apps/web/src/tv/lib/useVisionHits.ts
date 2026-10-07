import * as Sentry from '@sentry/browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VisionHitDto, VisionHitReplayDto } from '@/openapi/openapi';
import { useGroupSocket } from '~/tv/lib/hooks';
import { getDisplayHitReplay, getDisplayVisionHits } from '~/tv/server/visionHits';

export function useVisionHits(id: string, key: string, groupId: string | null, liveIds: string[]) {
    const queryClient = useQueryClient();
    const liveContext = JSON.stringify([...liveIds].sort());
    const active = useRef({ groupId, liveIds });
    const [replay, setReplay] = useState<{ hit: VisionHitDto; replay: VisionHitReplayDto } | null>(
        null
    );
    const [message, setMessage] = useState<string | null>(null);
    const generation = useRef(0);
    const seen = useRef(new Map<string, number>());
    const cancelPending = useCallback(() => {
        generation.current++;
    }, []);
    useEffect(() => {
        const ids = JSON.parse(liveContext) as string[];
        active.current = { groupId, liveIds: ids };
        generation.current++;
        // oxlint-disable-next-line react/set-state-in-effect -- End external playback when its group or match is gone.
        setReplay((current) =>
            current && current.hit.groupId === groupId && ids.includes(current.hit.liveMatchId)
                ? current
                : null
        );
        // Cancel pending loads even when no replay has reached the screen yet.
        return cancelPending;
    }, [id, key, groupId, liveContext, cancelPending]);
    const close = useCallback(() => {
        generation.current++;
        setReplay(null);
    }, []);
    const refresh = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['vision-hits-tv', id] });
    }, [queryClient, id]);
    const requestReplay = useCallback(
        (group: string, hitId: string, liveMatchId: string, requestedAt: string) => {
            const at = Date.parse(requestedAt),
                now = Date.now();
            if (
                !Number.isFinite(at) ||
                at > now ||
                now - at > 20_000 ||
                group !== active.current.groupId ||
                !active.current.liveIds.includes(liveMatchId)
            )
                return;
            // Go events and Postgres timestamps may spell the same instant differently.
            const requestKey = `${hitId}:${at}`;
            for (const [request, time] of seen.current) {
                if (now - time > 20_000) seen.current.delete(request);
            }
            if (seen.current.has(requestKey) || seen.current.size >= 200) return;
            // Closing, finishing or failing a request must not replay it on the next refetch.
            seen.current.set(requestKey, at);
            const token = ++generation.current;
            void getDisplayHitReplay({ data: { id, key, hitId } })
                .then((value) => {
                    if (
                        token !== generation.current ||
                        group !== active.current.groupId ||
                        value.hit.groupId !== group ||
                        value.hit.liveMatchId !== liveMatchId ||
                        !active.current.liveIds.includes(liveMatchId) ||
                        Date.now() - at > 20_000
                    )
                        return;
                    if (!value.replay.complete || !value.replay.segments.length) {
                        setMessage(
                            'Replay is pending or has a recording gap. Try again in the app.'
                        );
                        return;
                    }
                    setMessage(null);
                    setReplay(value);
                })
                .catch(() => {
                    if (token !== generation.current) return;
                    setReplay(null);
                    setMessage('Replay unavailable. Live camera continues.');
                    Sentry.captureMessage('TV hit replay unavailable', {
                        level: 'warning',
                        tags: { operation: 'hit-replay' },
                        extra: { hitId, tvId: id },
                    });
                });
        },
        [id, key]
    );
    const onEvent = useCallback(
        (event: unknown) => {
            const e = event as {
                groupId?: string;
                eventType?: string;
                scope?: string;
                body?: { id?: string; liveMatchId?: string; requestedAt?: string };
            } | null;
            if (e?.eventType !== 'VISION_HITS' || e.groupId !== active.current.groupId) return;
            if (e.scope === 'visionHitDeleted') {
                // A fetch already in flight must not resurrect a deleted replay.
                generation.current++;
                setReplay((current) => (current?.hit.id === e.body?.id ? null : current));
                queryClient.setQueriesData<VisionHitDto[]>(
                    { queryKey: ['vision-hits-tv', id] },
                    (rows) => rows?.filter((hit) => hit.id !== e.body?.id)
                );
                return;
            }
            if (
                e.scope === 'visionHitReplay' &&
                typeof e.groupId === 'string' &&
                typeof e.body?.id === 'string' &&
                typeof e.body.liveMatchId === 'string' &&
                typeof e.body.requestedAt === 'string'
            )
                requestReplay(e.groupId, e.body.id, e.body.liveMatchId, e.body.requestedAt);
        },
        [id, queryClient, requestReplay]
    );
    useGroupSocket(groupId, refresh, onEvent);
    const hits = useQuery({
        queryKey: ['vision-hits-tv', id, groupId],
        queryFn: () => getDisplayVisionHits({ data: { id, key } }),
        enabled: !!groupId,
        refetchInterval: 10_000,
    });
    useEffect(() => {
        // Reconnect refetches recover replay broadcasts missed while the socket was down.
        // Old cached rows may not have the nullable replay timestamp yet.
        const requested = (hits.data ?? [])
            .filter((hit) => typeof hit.replayRequestedAt === 'string')
            .sort((a, b) => Date.parse(a.replayRequestedAt!) - Date.parse(b.replayRequestedAt!));
        for (const hit of requested) {
            requestReplay(hit.groupId, hit.id, hit.liveMatchId, hit.replayRequestedAt!);
        }
    }, [hits.data, requestReplay, groupId, liveContext]);
    useEffect(() => {
        if (!replay) return;
        const timeout = setTimeout(close, 20_000);
        return () => clearTimeout(timeout);
    }, [replay, close]);
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(null), 8000);
        return () => clearTimeout(timer);
    }, [message]);
    return { hits: hits.data ?? [], replay, close, message };
}
