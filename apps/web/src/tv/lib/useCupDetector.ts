import { useEffect, useRef, useState, type RefObject } from 'react';

import { CupMembership, cupSearchAreas } from '~/tv/lib/cupMembership';
import { CupPersistence } from '~/tv/lib/cupPersistence';
import { MAX_AGE_MS, type CupFrame, type PlayingArea } from '~/tv/lib/cupVision';
import type { CupResult } from '~/tv/lib/cupWorker';

/** A separate, single-flight worker can fall behind without queuing work or delaying video. */
export function useCupDetector(
    video: RefObject<HTMLVideoElement | null>,
    enabled: boolean,
    send: (frame: CupFrame) => void,
    cameraId: string,
    groupId: string | null,
    areas: PlayingArea[] | null,
    observe: (frame: CupFrame, aspect: number) => void,
    membership: { key: string; counts: [number, number] } | null = null,
    observeRaw?: (frame: CupFrame, aspect: number) => void
) {
    const membershipRef = useRef(membership);
    const rawObserverRef = useRef(observeRaw);
    useEffect(() => {
        membershipRef.current = membership;
        rawObserverRef.current = observeRaw;
    }, [membership, observeRaw]);
    const [status, setStatus] = useState('Cup outlines off');
    const [previous, setPrevious] = useState({ enabled, groupId, areas });
    if (previous.enabled !== enabled || previous.groupId !== groupId || previous.areas !== areas) {
        setPrevious({ enabled, groupId, areas });
        setStatus('Loading cup recognition…');
    }
    useEffect(() => {
        const state = !enabled
            ? 'off'
            : !groupId
              ? 'unpaired'
              : !areas
                ? 'needs-playing-areas'
                : typeof Worker === 'undefined' || typeof WebAssembly === 'undefined'
                  ? 'browser-unsupported'
                  : 'starting';
        // Child effects can run before the TV layout initializes Sentry.
        void import('~/tv/sentry').then(async ({ initTvSentry }) => {
            initTvSentry();
            const Sentry = await import('@sentry/browser');
            Sentry.logger.info('cup vision state', { cameraId, groupId, state });
        });
        if (!enabled || !groupId || !areas) {
            return;
        }
        if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
            return;
        }
        let worker: Worker;
        try {
            worker = new Worker(new URL('./cupWorker.ts', import.meta.url), { type: 'module' });
        } catch {
            // oxlint-disable-next-line react/set-state-in-effect -- Report an external worker constructor failure.
            setStatus('Cup recognition could not start in this browser');
            void import('@sentry/browser').then((Sentry) =>
                Sentry.captureMessage('cup vision worker unavailable', {
                    level: 'warning',
                    tags: { operation: 'cup-vision', cameraId },
                })
            );
            return;
        }
        const surface = document.createElement('canvas');
        const context = surface.getContext('2d', { willReadFrequently: true });
        let stopped = false;
        let ready = false;
        let waiting = false;
        let capturedAt = 0;
        let nextAt = 0;
        let sequence = 0;
        let model = '';
        let count = 0;
        let dropped = 0;
        const latencies = {
            inference: [] as number[],
            preprocessing: [] as number[],
            modelRun: [] as number[],
            postprocessing: [] as number[],
            wallAge: [] as number[],
            overhead: [] as number[],
        };
        const sampleLatency = (name: keyof typeof latencies, value: number | undefined) => {
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return;
            const samples = latencies[name];
            samples.push(value);
            // Background timer throttling must not grow the diagnostic buffer.
            if (samples.length > 300) samples.shift();
        };
        let workerCrossOriginIsolated = -1;
        let workerNumThreads = -1;
        let lastCupCount = 0;
        let heldCupCount = 0;
        let ignoredCupCount = 0;
        let playingCupCount = 0;
        let persistence = [new CupPersistence(), new CupPersistence()];
        let persistenceKey = '';
        const rackMembership = new CupMembership();
        const searchAreas = cupSearchAreas(areas);
        const attributes = () => ({ cameraId, groupId, model, backend: 'wasm-worker' });
        const log = (message: string, extra: Record<string, string | number> = {}) => {
            void import('@sentry/browser').then((Sentry) =>
                Sentry.logger.info(`cup vision ${message}`, { ...attributes(), ...extra })
            );
        };
        let deadline: ReturnType<typeof setTimeout>;
        const timers: {
            sample?: ReturnType<typeof setInterval>;
            heartbeat?: ReturnType<typeof setInterval>;
        } = {};
        const fail = (message: string) => {
            if (stopped) return;
            stopped = true;
            clearTimeout(deadline);
            clearInterval(timers.sample);
            clearInterval(timers.heartbeat);
            worker.terminate();
            setStatus('Cup recognition unavailable. Toggle outlines to retry.');
            send({ version: 1, model, sequence: ++sequence, ageMs: 0, cups: [] });
            void import('@sentry/browser').then((Sentry) =>
                Sentry.captureMessage('cup vision failed', {
                    level: 'warning',
                    tags: { operation: 'cup-vision', cameraId, model },
                    extra: { ...attributes(), message },
                })
            );
        };
        deadline = setTimeout(() => fail('Model load timed out'), 120_000);
        worker.onerror = (event) => fail(event.message || 'Worker error');
        worker.onmessage = ({ data }: MessageEvent<CupResult>) => {
            if (stopped) return;
            if (data.type === 'progress') {
                setStatus(data.message);
                return;
            }
            clearTimeout(deadline);
            if (data.type === 'error') return fail(data.message);
            if (data.type === 'ready') {
                ready = true;
                model = data.model.id;
                setStatus('Cup outlines ready');
                workerCrossOriginIsolated =
                    typeof data.crossOriginIsolated === 'boolean'
                        ? Number(data.crossOriginIsolated)
                        : -1;
                workerNumThreads =
                    typeof data.numThreads === 'number' && Number.isFinite(data.numThreads)
                        ? data.numThreads
                        : -1;
                log('loaded', {
                    loadMs: Math.round(data.loadMs),
                    source: data.model.source,
                    workerCrossOriginIsolated,
                    workerNumThreads,
                });
                return;
            }
            waiting = false;
            const ageMs = performance.now() - capturedAt;
            sampleLatency('inference', data.inferenceMs);
            sampleLatency('preprocessing', data.preprocessMs);
            sampleLatency('modelRun', data.modelRunMs);
            sampleLatency('postprocessing', data.postprocessMs);
            sampleLatency('wallAge', ageMs);
            // Both durations use their own monotonic clock; this difference covers
            // dispatch, result transfer and delayed main-thread delivery, not capture.
            sampleLatency('overhead', Math.max(0, ageMs - data.inferenceMs));
            // Leave headroom for the peer connection; old positions shouldn't outline new frames.
            if (ageMs < MAX_AGE_MS * 0.9) {
                const selected = rackMembership.observe(
                    data.cups,
                    areas,
                    surface.width / surface.height,
                    performance.now(),
                    membershipRef.current?.counts ?? null,
                    membershipRef.current?.key ?? ''
                );
                ignoredCupCount = selected.ignored;
                playingCupCount = selected.cups.length;
                const frame = {
                    version: 1 as const,
                    model,
                    sequence: ++sequence,
                    ageMs,
                    cups: selected.fresh,
                };
                const key = membershipRef.current?.key ?? '';
                if (key !== persistenceKey) {
                    persistence = [new CupPersistence(), new CupPersistence()];
                    persistenceKey = key;
                }
                const displayed = selected.sides.flatMap((cups, side) => {
                    const shown = persistence[side].observe(cups, performance.now());
                    const limit = membershipRef.current?.counts[side];
                    return limit === undefined ? shown.cups : shown.cups.slice(0, limit);
                });
                heldCupCount = Math.max(0, displayed.length - selected.cups.length);
                send({ ...frame, cups: displayed });
                // Fresh selected geometry only: spare cups and held outlines cannot become hit evidence.
                rawObserverRef.current?.(frame, surface.width / surface.height);
                observe(frame, surface.width / surface.height);
            } else dropped++;
            nextAt = performance.now() + 150;
            count++;
            lastCupCount = data.cups.length;
            setStatus(
                ageMs < MAX_AGE_MS * 0.9
                    ? `Cup outlines: ${playingCupCount} in racks${ignoredCupCount ? ` · ${ignoredCupCount} outside play` : ''}${heldCupCount ? ` · ${heldCupCount} briefly tracked` : ''}`
                    : 'Recognition is too slow on this device; outlines paused'
            );
        };
        worker.postMessage({ type: 'load', base: `${location.origin}/vision/` });
        timers.sample = setInterval(() => {
            const v = video.current;
            if (
                stopped ||
                !ready ||
                waiting ||
                document.hidden ||
                performance.now() < nextAt ||
                !v ||
                v.readyState < 2 ||
                !v.videoWidth ||
                !context
            )
                return;
            try {
                surface.width = v.videoWidth;
                surface.height = v.videoHeight;
                context.drawImage(v, 0, 0);
                const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
                capturedAt = performance.now();
                waiting = true;
                deadline = setTimeout(() => fail('Inference timed out'), 20_000);
                worker.postMessage(
                    {
                        type: 'frame',
                        pixels,
                        width: surface.width,
                        height: surface.height,
                        areas: searchAreas,
                    },
                    [pixels.buffer]
                );
            } catch (error) {
                fail(error instanceof Error ? error.message : String(error));
            }
        }, 100);
        timers.heartbeat = setInterval(() => {
            if (!ready || stopped) return;
            const timingStats: Record<string, number> = {};
            for (const [name, samples] of Object.entries(latencies)) {
                samples.sort((a, b) => a - b);
                if (samples.length) {
                    timingStats[`${name}P50Ms`] = Math.round(
                        samples[Math.floor(samples.length * 0.5)]
                    );
                    timingStats[`${name}P95Ms`] = Math.round(
                        samples[Math.floor(samples.length * 0.95)]
                    );
                }
                samples.length = 0;
            }
            log('stats', {
                frames: count,
                published: count - dropped,
                dropped,
                cupCount: lastCupCount,
                heldCupCount,
                ignoredCupCount,
                playingCupCount,
                ...timingStats,
                workerCrossOriginIsolated,
                workerNumThreads,
                hidden: document.hidden ? 1 : 0,
            });
            count = dropped = 0;
        }, 30_000);
        return () => {
            stopped = true;
            clearTimeout(deadline);
            clearInterval(timers.sample);
            clearInterval(timers.heartbeat);
            worker.terminate();
            send({ version: 1, model, sequence: ++sequence, ageMs: 0, cups: [] });
            log('stopped');
        };
    }, [video, enabled, send, cameraId, groupId, areas, observe]);
    return !enabled || !groupId
        ? 'Cup outlines off'
        : !areas
          ? 'Select the two playing formations to enable outlines'
          : typeof Worker === 'undefined' || typeof WebAssembly === 'undefined'
            ? 'Cup outlines need a newer camera browser'
            : status;
}
