import { useEffect, useRef, useState, type RefObject } from 'react';

import type { CameraRotation } from '@/lib/tvDisplay';
import type { VisionHitDto } from '@/openapi/openapi';
import { drawBalls, ballAssistanceEnabled } from '~/tv/lib/ballGeometry';
import { drawCups } from '~/tv/lib/cupVision';
import { feedEventContext, noteFeed, setFeedVideo } from '~/tv/lib/feedTelemetry';

/**
 * Paint WebRTC frames into the board, rather than asking a TV's separate video plane to
 * follow its CSS transforms. The decoder stays attached across clips and fullscreen changes;
 * the stream belongs to cameraFeed, and recording belongs to the sending camera.
 */
export function CameraVideo({
    stream,
    flipped = false,
    rotation = 0,
    cameraId,
    videoRef,
    suspended = false,
    hit,
}: {
    stream: MediaStream;
    flipped?: boolean;
    rotation?: CameraRotation;
    cameraId: string;
    /** The sending camera reuses the unrotated decoder for cup detection and calibration. */
    videoRef?: RefObject<HTMLVideoElement | null>;
    suspended?: boolean;
    hit?: VisionHitDto | null;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const localDecoder = useRef<HTMLVideoElement>(null);
    const decoder = videoRef ?? localDecoder;
    const suspendedRef = useRef(suspended);
    const hitRef = useRef(hit);
    useEffect(() => {
        hitRef.current = hit;
    }, [hit]);
    useEffect(() => {
        suspendedRef.current = suspended;
        const video = decoder.current;
        if (suspended) video?.pause();
        else if (video?.srcObject) void video.play().catch(() => {});
    }, [suspended, decoder]);
    const [problem, setProblem] = useState<string | null>('Waiting for camera video…');

    useEffect(() => {
        const surface = canvas.current!;
        const context = surface.getContext('2d');
        // Keep a rendered source on the page instead of relying on a detached TV decoder.
        // The canvas presents the full picture; the native video plane stays one pixel.
        const video = decoder.current!;
        // oxlint-disable-next-line react/immutability -- Cup calibration reuses this decoder's raw MediaStream frames.
        video.srcObject = stream;
        setFeedVideo(video, cameraId);
        // what the player says it waits for, next to the feed's stats (feedTelemetry.ts)
        const note = (message: string) => noteFeed(message, {}, cameraId);
        const onWaiting = () => note('video waiting');
        const onStalled = () => note('video stalled');
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('stalled', onStalled);
        let stopped = false;
        let frame = 0;
        let paintedAt = performance.now();
        let progressedAt = paintedAt;
        let shownAt = -Infinity;
        let previousTime = -1;
        let previousCount = -1;
        let previousPixels: Uint8ClampedArray | undefined;
        const reported = new Set<string>();
        const warn = (message: string, error?: unknown) => {
            setProblem(message);
            if (reported.has(message)) return;
            reported.add(message);
            note(`playback warning: ${message}`);
            // Capture before recovery resets the player, including when Sentry loads lazily.
            const extra = {
                error: error instanceof Error ? error.message : error,
                readyState: video.readyState,
                paused: video.paused,
                width: video.videoWidth,
                height: video.videoHeight,
                currentTime: video.currentTime,
                frames: video.getVideoPlaybackQuality?.().totalVideoFrames,
                previousTime,
                previousCount,
                paintedAgoMs: performance.now() - paintedAt,
                progressedAgoMs: performance.now() - progressedAt,
                trackState: stream.getVideoTracks()[0]?.readyState,
                trackMuted: stream.getVideoTracks()[0]?.muted,
            };
            const feed = feedEventContext(cameraId);
            void import('@sentry/browser').then((Sentry) => {
                if (stopped) return;
                Sentry.captureMessage(`camera playback: ${message}`, {
                    level: 'warning',
                    tags: { ...feed.tags, operation: 'camera-playback' },
                    extra: { ...extra, ...feed.extra },
                });
            });
        };
        const play = () => {
            if (suspendedRef.current) return;
            video.play().catch((error: unknown) => {
                if (!stopped) warn('Camera video could not play. Reconnecting…', error);
            });
        };
        // A tiny probe catches platforms that expose black/transparent frames from a native
        // layer. Keep the last visible frame while retrying; never replace it with a black one.
        const probe = document.createElement('canvas');
        probe.width = 8;
        probe.height = 8;
        const sample = probe.getContext('2d');
        let attemptedAt = 0;
        let paintFailed = false;
        const paint = (now: number) => {
            frame = requestAnimationFrame(paint);
            if (suspendedRef.current) {
                paintedAt = now;
                progressedAt = now;
                return;
            }
            if (!context || !sample || now - attemptedAt < 1000 / 30) return;
            attemptedAt = now;
            if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
            const decoded = video.getVideoPlaybackQuality?.().totalVideoFrames;
            // A live stream's currentTime runs on while its picture stands still (Tizen's player
            // shows no new frame after a score clip, though WebRTC still decodes them), so count
            // the frames it shows where the browser does.
            let progressed =
                decoded === undefined
                    ? video.currentTime !== previousTime
                    : decoded !== previousCount;
            previousTime = video.currentTime;
            previousCount = decoded ?? -1;
            try {
                // Playback counters on older TVs are diagnostic, not a gate on drawing.
                // Sampling also catches changing frames when those counters stay constant.
                sample.drawImage(video, 0, 0, 8, 8);
                const pixels = sample.getImageData(0, 0, 8, 8).data;
                progressed ||= pixels.some((value, i) => value !== previousPixels?.[i]);
                previousPixels = pixels;
                // A frame now and then (Tizen's player on a new stream) is no moving picture.
                const moving = progressed && now - shownAt < 1000;
                if (progressed) shownAt = now;
                if (moving) progressedAt = now;
                if (!pixels.some((value, i) => i % 4 !== 3 && value > 4)) return;
                const scale = Math.min(1, 1280 / video.videoWidth, 720 / video.videoHeight);
                const sourceWidth = Math.round(video.videoWidth * scale);
                const sourceHeight = Math.round(video.videoHeight * scale);
                const sideways = rotation === 90 || rotation === 270;
                const width = sideways ? sourceHeight : sourceWidth;
                const height = sideways ? sourceWidth : sourceHeight;
                if (surface.width !== width || surface.height !== height) {
                    surface.width = width;
                    surface.height = height;
                }
                context.save();
                context.clearRect(0, 0, width, height);
                context.translate(width / 2, height / 2);
                context.rotate((rotation * Math.PI) / 180);
                context.drawImage(
                    video,
                    -sourceWidth / 2,
                    -sourceHeight / 2,
                    sourceWidth,
                    sourceHeight
                );
                // Contours use raw frame coordinates and turn with the picture.
                context.translate(-sourceWidth / 2, -sourceHeight / 2);
                drawCups(context, stream, now, { width: sourceWidth, height: sourceHeight });
                drawBalls(context, stream, now, { width: sourceWidth, height: sourceHeight });
                const suggestion = hitRef.current;
                if (
                    suggestion &&
                    suggestion.cameraId === cameraId &&
                    ballAssistanceEnabled(stream, now, suggestion.cameraOccurredAt)
                ) {
                    const c = suggestion.imageCup;
                    context.strokeStyle = '#ffe27a';
                    context.lineWidth = Math.max(2, sourceWidth / 240);
                    context.beginPath();
                    context.ellipse(
                        c.x * sourceWidth,
                        c.y * sourceHeight,
                        c.radius * sourceWidth * 1.2,
                        Math.max(4, c.radius * sourceWidth * 0.5),
                        0,
                        0,
                        Math.PI * 2
                    );
                    context.stroke();
                }
                context.restore();
                paintedAt = now;
                if (moving) {
                    if (reported.size) note('picture back');
                    setProblem(null);
                    reported.clear();
                }
                paintFailed = false;
            } catch (error) {
                paintFailed = true;
                warn('Camera frames could not be displayed on this browser.', error);
            }
        };
        // oxlint-disable-next-line react/set-state-in-effect -- Reset status when attaching a new decoder stream.
        setProblem('Waiting for camera video…');
        if (!context || !sample) warn('This browser cannot display camera frames.');
        else frame = requestAnimationFrame(paint);
        play();
        const recovery = setInterval(() => {
            if (document.hidden || suspendedRef.current) {
                paintedAt = performance.now();
                progressedAt = paintedAt;
                return;
            }
            if (!context || !sample || paintFailed) return;
            const now = performance.now();
            if (now - progressedAt > 5000) {
                warn('Camera playback stalled. Restarting the player…');
                note('recovery: restarted the player');
                // Reset this consumer, not the shared track or its WebRTC connection.
                video.pause();
                video.srcObject = null;
                video.srcObject = stream;
                progressedAt = now;
                play();
            } else if (now - paintedAt > 5000) {
                warn('Camera frames are dark. Waiting for a visible picture…');
            } else if (video.paused) {
                note('recovery: played the paused player');
                play();
            }
        }, 1000);
        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            clearInterval(recovery);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('stalled', onStalled);
            setFeedVideo(null, cameraId);
            video.pause();
            video.srcObject = null;
            // Do not stop any tracks: other consumers, including recording, own them.
        };
    }, [stream, rotation, cameraId, decoder]);

    return (
        <>
            <video
                ref={decoder}
                muted
                autoPlay
                playsInline
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 z-10 h-px w-px"
            />
            <canvas
                ref={canvas}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ transform: flipped ? 'scaleX(-1)' : undefined }}
            />
            {problem && !suspended && (
                <div
                    role="status"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 px-[4rem] text-center text-[1.8rem] text-text-2"
                >
                    {problem}
                </div>
            )}
        </>
    );
}
