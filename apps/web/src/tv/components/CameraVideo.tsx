import { useEffect, useRef, useState } from 'react';

/**
 * Paint WebRTC frames into the board, rather than asking a TV's separate video plane to
 * follow its CSS transforms. The decoder stays attached across clips and fullscreen changes;
 * the stream belongs to cameraFeed, and recording belongs to the sending camera.
 */
export function CameraVideo({ stream }: { stream: MediaStream }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [problem, setProblem] = useState<string | null>('Waiting for camera video…');

    useEffect(() => {
        const surface = canvas.current!;
        const context = surface.getContext('2d');
        // A detached WebRTC video supplies decoded frames without a native display plane.
        const video = document.createElement('video');
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', '');
        video.srcObject = stream;
        let stopped = false;
        let frame = 0;
        let paintedAt = performance.now();
        let previousTime = -1;
        let previousCount = -1;
        const reported = new Set<string>();
        const warn = (message: string, error?: unknown) => {
            setProblem(message);
            if (reported.has(message)) return;
            reported.add(message);
            void import('@sentry/browser').then((Sentry) => {
                if (stopped) return;
                Sentry.captureMessage(`camera playback: ${message}`, {
                    level: 'warning',
                    tags: { operation: 'camera-playback' },
                    extra: {
                        error: error === undefined ? undefined : String(error),
                        readyState: video.readyState,
                        paused: video.paused,
                        width: video.videoWidth,
                        height: video.videoHeight,
                        currentTime: video.currentTime,
                        frames: video.getVideoPlaybackQuality?.().totalVideoFrames,
                    },
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
            const count = decoded ? decoded : undefined;
            if (count === undefined ? video.currentTime === previousTime : count === previousCount)
                return;
            previousTime = video.currentTime;
            previousCount = count ?? -1;
            try {
                sample.drawImage(video, 0, 0, 8, 8);
                const pixels = sample.getImageData(0, 0, 8, 8).data;
                if (!pixels.some((value, i) => i % 4 !== 3 && value > 4)) return;
                const scale = Math.min(1, 1280 / video.videoWidth, 720 / video.videoHeight);
                const width = Math.round(video.videoWidth * scale);
                const height = Math.round(video.videoHeight * scale);
                if (surface.width !== width || surface.height !== height) {
                    surface.width = width;
                    surface.height = height;
                }
                context.drawImage(video, 0, 0, width, height);
                paintedAt = now;
                setProblem(null);
                reported.clear();
                paintFailed = false;
            } catch (error) {
                paintFailed = true;
                warn('Camera frames could not be displayed on this browser.', error);
            }
        };
        setProblem('Waiting for camera video…');
        if (!context || !sample) warn('This browser cannot display camera frames.');
        else frame = requestAnimationFrame(paint);
        play();
        const recovery = setInterval(() => {
            if (document.hidden) {
                paintedAt = performance.now();
                return;
            }
            if (!context || !sample || paintFailed) return;
            if (performance.now() - paintedAt > 5000) {
                warn('Camera picture is dark or stalled. Waiting for visible frames…');
                if (video.paused) play();
            }
        }, 1000);
        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            clearInterval(recovery);
            video.pause();
            video.srcObject = null;
            // Do not stop any tracks: other consumers, including recording, own them.
        };
    }, [stream]);

    return (
        <>
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
