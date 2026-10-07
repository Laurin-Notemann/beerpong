import { useEffect, useRef, useState } from 'react';

import { drawCups } from '~/tv/lib/cupVision';
import { feedEventContext, noteFeed, setFeedVideo } from '~/tv/lib/feedTelemetry';

/**
 * Paint WebRTC frames into the board, rather than asking a TV's separate video plane to
 * follow its CSS transforms. The decoder stays attached across clips and fullscreen changes;
 * the stream belongs to cameraFeed, and recording belongs to the sending camera.
 */
export function CameraVideo({ stream }: { stream: MediaStream }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const decoder = useRef<HTMLVideoElement>(null);
    const [problem, setProblem] = useState<string | null>('Waiting for camera video…');

    useEffect(() => {
        const surface = canvas.current!;
        const context = surface.getContext('2d');
        // Keep a rendered source on the page instead of relying on a detached TV decoder.
        // The canvas presents the full picture; the native video plane stays one pixel.
        const video = decoder.current!;
        video.srcObject = stream;
        setFeedVideo(video);
        // what the player says it waits for, next to the feed's stats (feedTelemetry.ts)
        const onWaiting = () => noteFeed('video waiting');
        const onStalled = () => noteFeed('video stalled');
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
            noteFeed(`playback warning: ${message}`);
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
            const feed = feedEventContext();
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
                const width = Math.round(video.videoWidth * scale);
                const height = Math.round(video.videoHeight * scale);
                if (surface.width !== width || surface.height !== height) {
                    surface.width = width;
                    surface.height = height;
                }
                context.drawImage(video, 0, 0, width, height);
                drawCups(context, stream, now);
                paintedAt = now;
                if (moving) {
                    if (reported.size) noteFeed('picture back');
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
            if (document.hidden) {
                paintedAt = performance.now();
                progressedAt = paintedAt;
                return;
            }
            if (!context || !sample || paintFailed) return;
            const now = performance.now();
            if (now - progressedAt > 5000) {
                warn('Camera playback stalled. Restarting the player…');
                noteFeed('recovery: restarted the player');
                // Reset this consumer, not the shared track or its WebRTC connection.
                video.pause();
                video.srcObject = null;
                video.srcObject = stream;
                progressedAt = now;
                play();
            } else if (now - paintedAt > 5000) {
                warn('Camera frames are dark. Waiting for a visible picture…');
            } else if (video.paused) {
                noteFeed('recovery: played the paused player');
                play();
            }
        }, 1000);
        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            clearInterval(recovery);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('stalled', onStalled);
            setFeedVideo(null);
            video.pause();
            video.srcObject = null;
            // Do not stop any tracks: other consumers, including recording, own them.
        };
    }, [stream]);

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
            <canvas ref={canvas} className="absolute inset-0 h-full w-full object-cover" />
            {problem && (
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
