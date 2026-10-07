import * as Sentry from '@sentry/browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VisionHitDto, VisionHitReplayDto } from '@/openapi/openapi';
import { useGroupSocket } from '~/tv/lib/hooks';
import { getDisplayHitReplay, getDisplayVisionHits } from '~/tv/server/visionHits';

export function useVisionHits(id: string, key: string, groupId: string | null, liveIds: string[]) {
    const queryClient = useQueryClient();
    const active = useRef({ groupId, liveIds });
    useEffect(() => {
        active.current = { groupId, liveIds };
    }, [groupId, liveIds]);
    const [replay, setReplay] = useState<{ hit: VisionHitDto; replay: VisionHitReplayDto } | null>(
        null
    );
    const [message, setMessage] = useState<string | null>(null);
    const generation = useRef(0);
    const seen = useRef(new Set<string>());
    const close = useCallback(() => {
        generation.current++;
        setReplay(null);
    }, []);
    const refresh = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['vision-hits-tv', id] });
    }, [queryClient, id]);
    const onEvent = useCallback(
        (event: unknown) => {
            const e = event as {
                eventType?: string;
                scope?: string;
                body?: { id?: string; liveMatchId?: string; requestedAt?: string };
            } | null;
            if (e?.eventType !== 'VISION_HITS') return;
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
                e.scope !== 'visionHitReplay' ||
                typeof e.body?.id !== 'string' ||
                typeof e.body.requestedAt !== 'string' ||
                !active.current.liveIds.includes(e.body.liveMatchId ?? '')
            )
                return;
            const requestKey = `${e.body.id}:${e.body.requestedAt}`;
            if (seen.current.has(requestKey)) return;
            seen.current.add(requestKey);
            if (seen.current.size > 200) seen.current = new Set([requestKey]);
            const hitId = e.body.id,
                token = ++generation.current,
                group = active.current.groupId;
            void getDisplayHitReplay({ data: { id, key, hitId } })
                .then((value) => {
                    if (
                        token !== generation.current ||
                        group !== active.current.groupId ||
                        !active.current.liveIds.includes(value.hit.liveMatchId)
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
        [id, key, queryClient]
    );
    useGroupSocket(groupId, refresh, onEvent);
    const hits = useQuery({
        queryKey: ['vision-hits-tv', id, groupId],
        queryFn: () => getDisplayVisionHits({ data: { id, key } }),
        enabled: !!groupId,
        refetchInterval: 10_000,
    });
    useEffect(() => {
        // Re-pairing never leaves another group's replay visible.
        // oxlint-disable-next-line react/set-state-in-effect -- End external replay playback when its group changes.
        close();
    }, [groupId, close]);
    useEffect(() => {
        // oxlint-disable-next-line react/set-state-in-effect -- Release the external video decoder when its match ends.
        if (replay && !liveIds.includes(replay.hit.liveMatchId)) close();
    }, [replay, liveIds, close]);
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
