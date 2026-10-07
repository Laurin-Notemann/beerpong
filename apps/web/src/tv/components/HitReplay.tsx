import * as Sentry from '@sentry/browser';
import { useEffect, useRef, useState } from 'react';

import type { CameraRotation } from '@/lib/tvDisplay';
import type { VisionHitDto, VisionHitReplayDto } from '@/openapi/openapi';

/** Uploaded archive segments are standalone files. Seek in camera time, stop at each
 * interval boundary, and skip overlap when crossing files. Incomplete coverage never plays. */
export function HitReplay({
    hit,
    replay,
    rotation = 0,
    flipped = false,
    onDone,
}: {
    hit: VisionHitDto;
    replay: VisionHitReplayDto;
    rotation?: CameraRotation;
    flipped?: boolean;
    onDone: () => void;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const [index, setIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const done = useRef(onDone);
    useEffect(() => {
        done.current = onDone;
    }, [onDone]);
    useEffect(() => {
        const surface = canvas.current!,
            player = video.current!,
            context = surface.getContext('2d');
        const segment = replay.segments[index];
        if (!segment || !replay.complete || !context) {
            done.current();
            return;
        }
        const previous = replay.segments[index - 1];
        const from = Math.max(
            segment.startSeconds,
            previous ? (Date.parse(previous.endedAt) - Date.parse(segment.startedAt)) / 1000 : 0
        );
        if (previous && Date.parse(segment.startedAt) > Date.parse(previous.endedAt) + 250) {
            // oxlint-disable-next-line react/set-state-in-effect -- Report invalid external recording coverage before releasing playback.
            setError('Recording gap. Returning to live camera.');
            done.current();
            return;
        }
        let frame = 0,
            stopped = false,
            advanced = false;
        const fail = () => {
            if (stopped) return;
            Sentry.captureMessage('TV hit replay playback failed', {
                level: 'warning',
                tags: { operation: 'hit-replay' },
                extra: {
                    hitId: hit.id,
                    matchId: hit.liveMatchId,
                    sessionId: hit.sessionId,
                    segmentId: segment.id,
                    index,
                },
            });
            setError('Replay could not play. Returning to live camera.');
            done.current();
        };
        const next = () => {
            if (stopped || advanced) return;
            advanced = true;
            player.pause();
            if (index + 1 >= replay.segments.length) done.current();
            else setIndex(index + 1);
        };
        const ready = () => {
            player.currentTime = from;
            void player.play().catch(fail);
        };
        const ended = () => {
            if (player.currentTime >= segment.endSeconds - 0.15) next();
            else fail();
        };
        const paint = () => {
            if (stopped) return;
            frame = requestAnimationFrame(paint);
            if (player.currentTime >= segment.endSeconds - 0.03) {
                next();
                return;
            }
            if (player.readyState < 2 || !player.videoWidth || !player.videoHeight) return;
            const scale = Math.min(1, 1280 / player.videoWidth, 720 / player.videoHeight);
            const w = Math.round(player.videoWidth * scale),
                h = Math.round(player.videoHeight * scale);
            const sideways = rotation === 90 || rotation === 270;
            const width = sideways ? h : w,
                height = sideways ? w : h;
            if (surface.width !== width || surface.height !== height) {
                surface.width = width;
                surface.height = height;
            }
            try {
                context.save();
                context.clearRect(0, 0, width, height);
                context.translate(width / 2, height / 2);
                context.rotate((rotation * Math.PI) / 180);
                context.drawImage(player, -w / 2, -h / 2, w, h);
                const eventSeconds =
                    (Date.parse(hit.cameraOccurredAt) - Date.parse(segment.startedAt)) / 1000;
                if (Math.abs(player.currentTime - eventSeconds) < 0.75) {
                    const c = hit.imageCup;
                    context.translate(-w / 2, -h / 2);
                    context.strokeStyle = '#ffe27a';
                    context.lineWidth = 3;
                    context.beginPath();
                    context.ellipse(
                        c.x * w,
                        c.y * h,
                        c.radius * w * 1.2,
                        Math.max(4, c.radius * w * 0.5),
                        0,
                        0,
                        Math.PI * 2
                    );
                    context.stroke();
                }
                context.restore();
            } catch {
                context.restore();
                fail();
            }
        };
        player.addEventListener('loadedmetadata', ready);
        player.addEventListener('error', fail);
        player.addEventListener('ended', ended);
        player.src = segment.url;
        player.load();
        frame = requestAnimationFrame(paint);
        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            player.pause();
            player.removeEventListener('loadedmetadata', ready);
            player.removeEventListener('error', fail);
            player.removeEventListener('ended', ended);
            player.removeAttribute('src');
            player.load();
        };
    }, [hit, replay, index, rotation]);
    return (
        <section aria-label="Suggested hit replay" className="absolute inset-0 z-50 bg-black">
            <video
                ref={video}
                muted
                playsInline
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 h-px w-px"
            />
            <canvas
                ref={canvas}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ transform: flipped ? 'scaleX(-1)' : undefined }}
            />
            <div className="absolute top-0 right-0 left-0 flex items-center justify-between bg-black/80 p-6 text-[1.6rem]">
                <span>{error ?? `REPLAY · possible hit on ${hit.team} · recognition only`}</span>
                <button
                    type="button"
                    className="rounded-xl bg-panel px-5 py-3 font-bold"
                    onClick={onDone}
                >
                    Back to live
                </button>
            </div>
        </section>
    );
}
