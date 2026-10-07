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
        let latencies: number[] = [];
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
                log('loaded', { loadMs: Math.round(data.loadMs), source: data.model.source });
                return;
            }
            waiting = false;
            const ageMs = performance.now() - capturedAt;
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
                    cups: selected.ambiguous ? [] : selected.cups,
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
                rawObserverRef.current?.(
                    { ...frame, cups: data.cups },
                    surface.width / surface.height
                );
                observe(frame, surface.width / surface.height);
            } else dropped++;
            nextAt = performance.now() + 150;
            count++;
            lastCupCount = data.cups.length;
            latencies.push(data.inferenceMs);
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
            latencies.sort((a, b) => a - b);
            log('stats', {
                frames: count,
                published: count - dropped,
                dropped,
                cupCount: lastCupCount,
                heldCupCount,
                ignoredCupCount,
                playingCupCount,
                inferenceP50Ms: Math.round(latencies[Math.floor(latencies.length * 0.5)] ?? 0),
                inferenceP95Ms: Math.round(latencies[Math.floor(latencies.length * 0.95)] ?? 0),
                hidden: document.hidden ? 1 : 0,
            });
            count = dropped = 0;
            latencies = [];
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
