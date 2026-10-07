import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { LOOKBACK_MS, type HitEntry, type HitObservation } from '~/tv/lib/ballVision';
import { cupSearchAreas } from '~/tv/lib/cupMembership';
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
        const log = (message: string, extra: Record<string, string | number> = {}) => {
            void import('~/tv/sentry').then(async ({ initTvSentry }) => {
                initTvSentry();
                const Sentry = await import('@sentry/browser');
                Sentry.logger.info(`ball lookback ${message}`, { cameraId, firstTeam, ...extra });
            });
        };
        const state = !enabled
            ? 'off'
            : !areas
              ? 'needs-playing-areas'
              : typeof Worker === 'undefined'
                ? 'unsupported-browser'
                : 'starting';
        log('state', { state });
        if (!enabled || !areas || typeof Worker === 'undefined') return;
        let instance: Worker;
        try {
            instance = new Worker(new URL('./ballWorker.ts', import.meta.url), { type: 'module' });
        } catch (error) {
            log('state', { state: 'failed', phase: 'startup', message: String(error) });
            void import('@sentry/browser').then((Sentry) =>
                Sentry.captureException(error, { tags: { operation: 'ball-lookback', cameraId } })
            );
            return;
        }
        let lastMediaTime = -1;
        let busy = false,
            ready = false,
            stopped = false,
            waitingSince = 0,
            samples = 0,
            skipped = 0,
            totalMs = 0,
            proposals = 0,
            obscuredFrames = 0;
        let capture: 'bitmap' | 'pixels' = 'pixels';
        let phase: 'capture' | 'processing' = 'capture';
        let frameId = 0;
        let surface: HTMLCanvasElement | null = null;
        let captureErrors = 0;
        const timers: {
            startup?: ReturnType<typeof setTimeout>;
            sample?: ReturnType<typeof setInterval>;
            heartbeat?: ReturnType<typeof setInterval>;
        } = {};
        const stop = () => {
            stopped = true;
            busy = false;
            clearTimeout(timers.startup);
            clearInterval(timers.sample);
            clearInterval(timers.heartbeat);
            if (worker.current === instance) worker.current = null;
            instance.terminate();
        };
        const fail = (message: string, phase: string) => {
            if (stopped) return;
            log('state', { state: 'failed', phase, message, samples, skipped });
            stop();
            setLatest(null);
            void import('@sentry/browser').then((Sentry) =>
                Sentry.captureMessage('ball lookback worker failed', {
                    level: 'warning',
                    tags: { cameraId, operation: 'ball-lookback' },
                    extra: { message, phase, samples, skipped, capture },
                })
            );
        };
        instance.onmessage = ({
            data,
        }: MessageEvent<
            | { type: 'ready'; canvas: boolean }
            | { type: 'error'; message: string; phase: string }
            | { type: 'hit'; result: HitObservation }
            | {
                  type: 'frame';
                  frameId: number;
                  processingMs: number;
                  count: number;
                  obscured: boolean;
              }
        >) => {
            if (stopped) return;
            if (data.type === 'error') {
                if (data.phase === 'frame' && capture === 'bitmap') {
                    capture = 'pixels';
                    busy = false;
                    log('capture fallback', { capture, message: data.message });
                    return;
                }
                return fail(data.message, data.phase);
            }
            if (data.type === 'ready') {
                ready = true;
                clearTimeout(timers.startup);
                capture =
                    data.canvas && typeof createImageBitmap !== 'undefined' ? 'bitmap' : 'pixels';
                worker.current = instance;
                log('state', { state: 'running', capture });
                return;
            }
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
                if (data.frameId !== frameId) return;
                busy = false;
                samples++;
                proposals += data.count;
                obscuredFrames += data.obscured ? 1 : 0;
                totalMs += data.processingMs;
            }
        };
        instance.onerror = (event) =>
            fail(event.message || 'Worker error', ready ? 'processing' : 'startup');
        instance.onmessageerror = () => fail('Worker message could not be decoded', 'message');
        timers.startup = setTimeout(
            () => fail('Worker ready handshake timed out', 'startup'),
            10_000
        );
        try {
            instance.postMessage({ type: 'init' });
        } catch (error) {
            fail(String(error), 'startup');
            return stop;
        }
        timers.sample = setInterval(() => {
            if (stopped) return;
            if (busy && performance.now() - waitingSince > 2000) {
                if (phase === 'capture' && capture === 'bitmap') {
                    // A video bitmap promise can remain unsettled on otherwise supported browsers.
                    frameId++;
                    capture = 'pixels';
                    busy = false;
                    log('capture fallback', { capture, message: 'Video bitmap capture timed out' });
                } else return fail('Ball frame processing timed out', phase);
            }
            const v = video.current;
            if (
                !ready ||
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
                const id = ++frameId;
                phase = 'capture';
                busy = true;
                waitingSince = performance.now();
                lastMediaTime = v.currentTime;
                if (capture === 'pixels') {
                    surface ??= document.createElement('canvas');
                    if (surface.width !== width || surface.height !== height) {
                        surface.width = width;
                        surface.height = height;
                    }
                    const context = surface.getContext('2d', { willReadFrequently: true });
                    if (!context) throw new Error('Ball capture canvas unavailable');
                    context.drawImage(v, 0, 0, width, height);
                    const pixels = context.getImageData(0, 0, width, height).data;
                    instance.postMessage(
                        {
                            type: 'frame',
                            frameId: id,
                            pixels,
                            width,
                            height,
                            at: capturedAt,
                            areas,
                        },
                        [pixels.buffer]
                    );
                    phase = 'processing';
                    waitingSince = performance.now();
                    captureErrors = 0;
                    return;
                }
                void createImageBitmap(v, {
                    resizeWidth: width,
                    resizeHeight: height,
                    resizeQuality: 'low',
                })
                    .then((bitmap) => {
                        if (stopped || id !== frameId) {
                            bitmap.close();
                            return;
                        }
                        instance.postMessage(
                            {
                                type: 'frame',
                                frameId: id,
                                bitmap,
                                width,
                                height,
                                at: capturedAt,
                                areas,
                            },
                            [bitmap]
                        );
                        phase = 'processing';
                        waitingSince = performance.now();
                    })
                    .catch((error) => {
                        if (stopped || id !== frameId) return;
                        // Some browsers expose ImageBitmap but reject video sources or resize options.
                        capture = 'pixels';
                        busy = false;
                        log('capture fallback', { capture, message: String(error) });
                    });
            } catch (error) {
                busy = false;
                captureErrors++;
                if (captureErrors >= 3) fail(String(error), 'capture');
            }
        }, 67);
        timers.heartbeat = setInterval(() => {
            if (stopped) return;
            // Capture counters before the async Sentry import and interval reset.
            const stats = {
                cameraId,
                samples,
                skipped,
                proposals,
                obscuredFrames,
                model: 'motion-proposals',
                state: ready ? 'running' : 'starting',
                capture,
                processingMeanMs: samples ? Math.round(totalMs / samples) : 0,
            };
            samples = skipped = totalMs = proposals = obscuredFrames = 0;
            void import('@sentry/browser').then((Sentry) =>
                Sentry.logger.info('ball lookback stats', stats)
            );
        }, 30_000);
        return stop;
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
                area: cupSearchAreas(areas)[entry.team === firstTeam ? 0 : 1],
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
