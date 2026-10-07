import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { LOOKBACK_MS, type HitEntry, type HitObservation } from '~/tv/lib/ballVision';
import type { CupFrame, PlayingArea } from '~/tv/lib/cupVision';

/** This camera-only path proposes evidence; recorded hits and the shared score stay authoritative. */
export function useBallHitLookback(
    video: RefObject<HTMLVideoElement | null>,
    enabled: boolean,
    cameraId: string,
    areas: PlayingArea[] | null,
    firstTeam: 'red' | 'blue',
    snapshot: {
        hits: HitEntry[];
        serverAt: number;
        receivedAt: number;
        clockUncertaintyMs: number;
    } | null
) {
    const worker = useRef<Worker | null>(null);
    const seen = useRef(new Set<string>());
    const [latest, setLatest] = useState<HitObservation | null>(null);
    useEffect(() => {
        const state = !enabled
            ? 'off'
            : !areas
              ? 'needs-playing-areas'
              : typeof Worker === 'undefined' ||
                  typeof createImageBitmap === 'undefined' ||
                  typeof OffscreenCanvas === 'undefined'
                ? 'unsupported-browser'
                : 'starting';
        void import('~/tv/sentry').then(async ({ initTvSentry }) => {
            initTvSentry();
            const Sentry = await import('@sentry/browser');
            Sentry.logger.info('ball lookback state', { cameraId, firstTeam, state });
        });
        if (
            !enabled ||
            !areas ||
            typeof Worker === 'undefined' ||
            typeof createImageBitmap === 'undefined' ||
            typeof OffscreenCanvas === 'undefined'
        )
            return;
        let instance: Worker;
        try {
            instance = new Worker(new URL('./ballWorker.ts', import.meta.url), { type: 'module' });
        } catch (error) {
            void import('@sentry/browser').then((Sentry) =>
                Sentry.captureException(error, { tags: { operation: 'ball-lookback', cameraId } })
            );
            return;
        }
        worker.current = instance;
        let lastMediaTime = -1;
        let busy = false,
            stopped = false,
            waitingSince = 0,
            samples = 0,
            skipped = 0,
            totalMs = 0,
            proposals = 0,
            obscuredFrames = 0;
        instance.onmessage = ({
            data,
        }: MessageEvent<
            | { type: 'hit'; result: HitObservation }
            | { type: 'frame'; processingMs: number; count: number; obscured: boolean }
        >) => {
            if (stopped) return;
            if (data.type === 'hit') {
                setLatest(data.result);
                void import('@sentry/browser').then((Sentry) =>
                    Sentry.logger.info('ball hit lookback', {
                        cameraId,
                        entryId: data.result.entryId,
                        matchId: data.result.matchId,
                        status: data.result.status,
                        reason: data.result.reason,
                        secondsBeforeEntry: data.result.secondsBeforeEntry ?? -1,
                        ballColor: data.result.ballColor ?? 'none',
                    })
                );
            } else {
                busy = false;
                samples++;
                proposals += data.count;
                obscuredFrames += data.obscured ? 1 : 0;
                totalMs += data.processingMs;
            }
        };
        const fail = (message: string) => {
            if (stopped) return;
            stopped = true;
            worker.current = null;
            instance.terminate();
            void import('@sentry/browser').then((Sentry) =>
                Sentry.captureMessage('ball lookback worker failed', {
                    level: 'warning',
                    tags: { cameraId, operation: 'ball-lookback' },
                    extra: { message },
                })
            );
        };
        instance.onerror = (event) => fail(event.message);
        const timer = setInterval(() => {
            if (busy && performance.now() - waitingSince > 2000)
                return fail('Ball frame processing timed out');
            const v = video.current;
            if (
                stopped ||
                busy ||
                document.hidden ||
                !v ||
                v.readyState < 2 ||
                !v.videoWidth ||
                v.currentTime === lastMediaTime
            ) {
                skipped++;
                return;
            }
            try {
                const width = Math.min(640, v.videoWidth),
                    height = Math.round((width * v.videoHeight) / v.videoWidth);
                const capturedAt = Date.now();
                busy = true;
                waitingSince = performance.now();
                lastMediaTime = v.currentTime;
                void createImageBitmap(v, {
                    resizeWidth: width,
                    resizeHeight: height,
                    resizeQuality: 'low',
                })
                    .then((bitmap) => {
                        if (stopped) {
                            bitmap.close();
                            return;
                        }
                        instance.postMessage(
                            { type: 'frame', bitmap, width, height, at: capturedAt, areas },
                            [bitmap]
                        );
                    })
                    .catch((error) => fail(String(error)));
            } catch (error) {
                fail(String(error));
            }
        }, 67);
        const heartbeat = setInterval(() => {
            void import('@sentry/browser').then((Sentry) =>
                Sentry.logger.info('ball lookback stats', {
                    cameraId,
                    samples,
                    skipped,
                    proposals,
                    obscuredFrames,
                    model: 'motion-proposals',
                    processingMeanMs: samples ? Math.round(totalMs / samples) : 0,
                })
            );
            samples = skipped = totalMs = proposals = obscuredFrames = 0;
        }, 30_000);
        return () => {
            stopped = true;
            clearInterval(timer);
            clearInterval(heartbeat);
            instance.terminate();
            worker.current = null;
        };
    }, [video, enabled, cameraId, areas, firstTeam]);
    useEffect(() => {
        if (!snapshot || !areas || !worker.current) return;
        setLatest((current) =>
            current && !snapshot.hits.some((entry) => entry.id === current.entryId) ? null : current
        );
        const now = Date.now();
        // Server entry time is not physical hit time. Correct obvious clock skew; uncertainty is
        // retained by considering the entire preceding window rather than asserting a timestamp.
        const offset = snapshot.receivedAt - snapshot.serverAt;
        if (snapshot.clockUncertaintyMs > 2000) return;
        for (const entry of snapshot.hits) {
            if (seen.current.has(entry.id)) continue;
            seen.current.add(entry.id);
            if (
                snapshot.serverAt - entry.enteredAt > LOOKBACK_MS ||
                entry.enteredAt > snapshot.serverAt
            )
                continue;
            worker.current.postMessage({
                type: 'hit',
                entry: { ...entry, enteredAt: entry.enteredAt + offset },
                area: areas[entry.team === firstTeam ? 0 : 1],
                at: now,
                aspect: (video.current?.videoWidth ?? 1) / (video.current?.videoHeight ?? 1),
            });
        }
        if (seen.current.size > 500) seen.current = new Set(snapshot.hits.map((h) => h.id));
    }, [snapshot, areas, firstTeam, video]);
    const observe = useCallback((frame: CupFrame) => {
        worker.current?.postMessage({
            type: 'cups',
            at: Date.now() - frame.ageMs,
            cups: frame.cups,
        });
    }, []);
    return { observe, latest: enabled && areas ? latest : null };
}
