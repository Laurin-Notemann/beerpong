import * as Sentry from '@sentry/browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VisionHitCreateDto, VisionHitDto } from '@/openapi/openapi';
import { ballRim, type BallColor } from '~/tv/lib/ballVision';
import type { useCameraMatches } from '~/tv/lib/cameraRecording';
import { FormationFitter, cupPoints, type FormationMatch } from '~/tv/lib/cupFormation';
import { cupSearchAreas } from '~/tv/lib/cupMembership';
import type { CupFrame, PlayingArea } from '~/tv/lib/cupVision';
import { hitModel } from '~/tv/lib/hitClassifier';
import { HIT_MODEL, type HitProposal } from '~/tv/lib/hitProposals';
import { useGroupSocket, useNow } from '~/tv/lib/hooks';
import { clearCameraHit, getDisplayVisionHits, proposeCameraHit } from '~/tv/server/visionHits';

export function useCameraHitProposals(
    id: string,
    key: string,
    enabled: boolean,
    device: string,
    match: FormationMatch | undefined,
    areas: PlayingArea[] | null,
    firstTeam: 'blue' | 'red',
    syncTvId: string,
    recording: { sessionId: string; recording: boolean },
    snapshot: ReturnType<typeof useCameraMatches>,
    ballColor: BallColor = 'both'
) {
    const context = JSON.stringify([
        enabled,
        device,
        match?.id,
        match?.seq,
        areas,
        firstTeam,
        syncTvId,
        recording.sessionId,
        ballColor,
    ]);
    // A new score invalidates proposal writes, while retrospective pixel evidence
    // remains useful for that score's lookback within the same recording and mapping.
    const historyContext = JSON.stringify([
        enabled,
        device,
        match?.id,
        areas,
        firstTeam,
        syncTvId,
        recording.sessionId,
        ballColor,
    ]);
    const current = useRef({
        context,
        historyContext,
        enabled,
        device,
        match,
        areas,
        firstTeam,
        syncTvId,
        recording,
        snapshot,
    });
    useEffect(() => {
        current.current = {
            context,
            historyContext,
            enabled,
            device,
            match,
            areas,
            firstTeam,
            syncTvId,
            recording,
            snapshot,
        };
    }, [
        context,
        historyContext,
        enabled,
        device,
        match,
        areas,
        firstTeam,
        syncTvId,
        recording,
        snapshot,
    ]);
    const [error, setError] = useState<string | null>(null);
    const pending = useRef(false);
    const queryClient = useQueryClient();
    const queryKey = ['vision-hits-camera', id, snapshot?.groupId, match?.id];
    const refresh = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['vision-hits-camera', id] });
    }, [queryClient, id]);
    useGroupSocket(snapshot?.groupId, refresh);
    const hits = useQuery({
        queryKey,
        queryFn: () => getDisplayVisionHits({ data: { id, key, liveMatchId: match?.id } }),
        enabled: !!snapshot?.groupId && !!match,
        refetchInterval: 15_000,
    });
    const geometry = useRef<{
        context: string;
        historyContext: string;
        at: number;
        aspect: number;
        frame: CupFrame;
        fitters: [FormationFitter, FormationFitter];
    } | null>(null);
    const observe = useCallback((frame: CupFrame, aspect: number) => {
        const live = current.current;
        if (!live.enabled || !live.match || !live.areas || frame.ageMs > 1500) return;
        if (!geometry.current || geometry.current.context !== live.context)
            geometry.current = {
                context: live.context,
                historyContext: live.historyContext,
                at: 0,
                aspect,
                frame,
                // Scores invalidate proposal writes, but the measured rack plane remains
                // useful for identifying the remaining cups in this unchanged mapping.
                fitters:
                    geometry.current?.historyContext === live.historyContext
                        ? geometry.current.fitters
                        : [new FormationFitter(), new FormationFitter()],
            };
        const value = geometry.current;
        value.at = Date.now() - frame.ageMs;
        value.aspect = aspect;
        value.frame = frame;
        for (let side = 0; side < 2; side++) {
            const team = side === 0 ? live.firstTeam : live.firstTeam === 'blue' ? 'red' : 'blue';
            const a = live.areas[side],
                b = live.areas[1 - side];
            value.fitters[side].observe(
                frame.cups,
                a,
                aspect,
                live.match[team].map((s) => s.drawn),
                live.match.templates,
                {
                    x: (b.x + b.width / 2 - a.x - a.width / 2) * aspect,
                    y: b.y + b.height / 2 - a.y - a.height / 2,
                }
            );
        }
    }, []);
    const propose = useCallback(
        (proposal: HitProposal, sourceContext: string) => {
            const live = current.current;
            const now = Date.now();
            if (
                !live.enabled ||
                live.context !== sourceContext ||
                pending.current ||
                !live.recording.recording ||
                !live.match ||
                !live.areas ||
                !live.snapshot ||
                now - live.snapshot.receivedAt > 20_000 ||
                live.snapshot.clockUncertaintyMs > 2000 ||
                now - proposal.at > 1500 ||
                proposal.at > now
            )
                return;
            const search = cupSearchAreas(live.areas);
            const sides = search
                .map((area, i) => ({ area, i }))
                .filter(
                    ({ area }) =>
                        proposal.imageCup.x >= area.x &&
                        proposal.imageCup.x <= area.x + area.width &&
                        proposal.imageCup.y >= area.y &&
                        proposal.imageCup.y <= area.y + area.height
                );
            if (sides.length !== 1) return;
            const side = sides[0].i;
            const team = side === 0 ? live.firstTeam : live.firstTeam === 'blue' ? 'red' : 'blue';
            let cup: VisionHitCreateDto['cup'] = null;
            const geo = geometry.current;
            if (geo?.context === sourceContext && now - geo.at <= 1500) {
                const observed = geo.frame.cups
                    .map((c) => ({ c, rim: ballRim(c) }))
                    .filter(
                        (v) =>
                            v.rim &&
                            Math.hypot(
                                (v.rim.x - proposal.imageCup.x) * geo.aspect,
                                v.rim.y - proposal.imageCup.y
                            ) < 0.01
                    );
                if (observed.length === 1) {
                    const point = cupPoints([observed[0].c], live.areas[side], geo.aspect)[0];
                    const drawn = point
                        ? geo.fitters[side].identify(
                              point,
                              live.match[team].map((s) => s.drawn)
                          )
                        : null;
                    cup = drawn
                        ? (live.match[team].find(
                              (s) => s.drawn.x === drawn.x && s.drawn.y === drawn.y
                          )?.cup ?? null)
                        : null;
                }
            }
            const hitId = crypto.randomUUID();
            const hit: VisionHitCreateDto = {
                liveMatchId: live.match.id,
                expectedSeq: live.match.seq,
                cameraId: id,
                sessionId: live.recording.sessionId,
                model: hitModel?.id ?? HIT_MODEL,
                cameraOccurredAt: new Date(proposal.at).toISOString(),
                occurredAt: new Date(
                    proposal.at - live.snapshot.receivedAt + live.snapshot.serverAt
                ).toISOString(),
                team,
                cup,
                imageCup: proposal.imageCup,
                confidence: proposal.confidence,
                evidence: proposal.evidence,
            };
            const data = {
                id,
                key,
                hitId,
                hit,
                seq: live.match.seq,
                snapshotId: live.snapshot.snapshotId,
                receivedAt: live.snapshot.receivedAt,
                clockUncertaintyMs: live.snapshot.clockUncertaintyMs,
                areas: live.areas,
                firstTeam: live.firstTeam,
                syncTvId: live.syncTvId,
                device: live.device,
                ballColor,
            };
            pending.current = true;
            const submit = async () => {
                for (let attempt = 0; attempt < 3; attempt++) {
                    if (
                        current.current.context !== sourceContext ||
                        Date.now() - proposal.at > 15_000
                    )
                        return;
                    try {
                        const saved = await proposeCameraHit({
                            data: { ...data, retry: attempt > 0 },
                        });
                        setError(null);
                        queryClient.setQueryData<VisionHitDto[]>(
                            ['vision-hits-camera', id, live.snapshot!.groupId, live.match!.id],
                            (rows) =>
                                [saved, ...(rows ?? []).filter((row) => row.id !== saved.id)].slice(
                                    0,
                                    100
                                )
                        );
                        Sentry.logger.info('hit assistance proposal', {
                            cameraId: id,
                            hitId,
                            matchId: hit.liveMatchId,
                            sessionId: hit.sessionId,
                            model: hit.model,
                            latencyMs: Date.now() - proposal.at,
                            observations: hit.evidence.observations,
                        });
                        return;
                    } catch (cause) {
                        const message = cause instanceof Error ? cause.message : '';
                        // Changed mappings, ended matches, duplicate limits and stale snapshots need fresh evidence.
                        if (
                            /Stale|OutsideArea|NoLongerStanding|Rate|Conflict|invalid|NotPaired/.test(
                                message
                            ) ||
                            attempt === 2
                        ) {
                            setError(
                                'Hit suggestion could not be shared. Check the match and camera mapping.'
                            );
                            Sentry.captureMessage('hit assistance proposal failed', {
                                level: 'warning',
                                tags: { operation: 'hit-proposal' },
                                extra: {
                                    cameraId: id,
                                    hitId,
                                    matchId: hit.liveMatchId,
                                    model: hit.model,
                                    attempt,
                                },
                            });
                            return;
                        }
                        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                    }
                }
            };
            void submit().finally(() => {
                pending.current = false;
            });
        },
        [id, key, queryClient, ballColor]
    );
    const now = useNow();
    const latest =
        enabled && match
            ? ((hits.data ?? []).find(
                  (hit) =>
                      hit.cameraId === id &&
                      hit.liveMatchId === match.id &&
                      hit.label !== 'declined' &&
                      now - Date.parse(hit.cameraOccurredAt) < 10_000 &&
                      Date.parse(hit.cameraOccurredAt) <= now + 2000
              ) ?? null)
            : null;
    const clear = useCallback(async () => {
        if (!latest) {
            setError(null);
            return;
        }
        try {
            await clearCameraHit({ data: { id, key, hitId: latest.id } });
            setError(null);
            refresh();
        } catch {
            setError('Could not clear the shared suggestion. Try again.');
        }
    }, [id, key, latest, refresh]);
    return { context, historyContext, propose, observe, latest, clear, error };
}
