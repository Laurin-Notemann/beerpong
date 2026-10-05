import { useEffect, useRef, useState } from 'react';

import type { ScoreClip } from '~/tv/lib/scoreClips';

/** a clip plays at most this long, whatever was uploaded */
const MAX_SECONDS = 5;
/** a clip that hasn't started by then is skipped */
const LOAD_TIMEOUT_MS = 8_000;
/** a local copy that hasn't loaded by then is streamed instead */
const LOCAL_TIMEOUT_MS = 2_500;
/** how long the column takes to close (`.score-clip.leaving` in styles.css) */
const LEAVE_MS = 350;
/** the full height of the screen, inside its padding */
const CLIP_HEIGHT = 'calc(100vh - 5rem)';
const CLIP_WIDTH = `calc((100vh - 5rem) * 9 / 16)`;

/**
 * The scorer's clip in a 9:16 column that opens on the `from` side of the screen and pushes the
 * board aside, so nothing is covered. Plays `src` (the clip's local copy, see useClipCache) with
 * sound; calls `onDone` once the column closed again.
 */
export function ScoreClipPanel({
    clip,
    src,
    from,
    onDone,
}: {
    clip: ScoreClip;
    src: string;
    from: 'left' | 'right';
    onDone: () => void;
}) {
    const video = useRef<HTMLVideoElement>(null);
    // a download that finishes while the clip streams doesn't restart it
    const [source, setSource] = useState(src);
    // some TV players won't open a local copy (a blob: URL); then the clip streams
    const local = source !== clip.url;
    const stream = () => {
        report(video.current!, 'local copy failed, streaming');
        setSource(clip.url);
    };
    const [playing, setPlaying] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const done = useRef(onDone);
    done.current = onDone;

    useEffect(() => {
        const v = video.current!;
        // the TV's browser plays with sound; newer ones may only allow it muted
        v.play()
            .catch(() => {
                v.muted = true;
                return v.play();
            })
            .catch((err) => {
                report(v, `play() failed: ${err}`);
                setLeaving(true);
            });
    }, [source]);

    useEffect(() => {
        if (!local) return;
        const timeout = setTimeout(() => {
            if (video.current!.readyState === 0) stream();
        }, LOCAL_TIMEOUT_MS);
        return () => clearTimeout(timeout);
    }, [local]);

    useEffect(() => {
        if (playing) return;
        const timeout = setTimeout(() => {
            report(video.current!, `didn't start within ${LOAD_TIMEOUT_MS} ms`);
            setLeaving(true);
        }, LOAD_TIMEOUT_MS);
        return () => clearTimeout(timeout);
    }, [playing]);

    useEffect(() => {
        if (!playing) return;
        const cap = setTimeout(() => setLeaving(true), MAX_SECONDS * 1000);
        return () => clearTimeout(cap);
    }, [playing]);

    useEffect(() => {
        if (!leaving) return;
        const timeout = setTimeout(() => done.current(), LEAVE_MS);
        return () => clearTimeout(timeout);
    }, [leaving]);

    return (
        // the column's width opens and closes (styles.css); the clip keeps its size and stays on
        // the board's side of it, so it slides in from the edge of the screen
        <div
            className={`score-clip ${leaving ? 'leaving' : ''} flex shrink-0 overflow-hidden ${from === 'left' ? 'justify-end' : 'order-last'}`}
            style={{ width: `calc(${CLIP_WIDTH} + 2.5rem)` }}
        >
            <div
                className={`shrink-0 py-[2.5rem] ${from === 'left' ? 'pl-[2.5rem]' : 'pr-[2.5rem]'}`}
            >
                <div
                    className={`relative overflow-hidden rounded-[2rem] border-[0.4rem] bg-black ${clip.team === 'blue' ? 'border-blue' : 'border-red'}`}
                    // 9:16 from the height; `aspect-ratio` is too new for the TV's browser
                    style={{ height: CLIP_HEIGHT, width: CLIP_WIDTH }}
                >
                    <video
                        ref={video}
                        src={source}
                        playsInline
                        preload="auto"
                        onPlaying={() => setPlaying(true)}
                        onEnded={() => setLeaving(true)}
                        onError={(e) => {
                            if (local) return stream();
                            report(e.currentTarget, `error ${e.currentTarget.error?.code}`);
                            setLeaving(true);
                        }}
                        className="block h-full w-full object-contain"
                    />
                    <div
                        className="absolute right-0 bottom-0 left-0 truncate px-[1.6rem] pt-[4rem] pb-[1.4rem] text-[2.4rem] font-black"
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        }}
                    >
                        {clip.name}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** a clip that doesn't play goes to Sentry (sentry.ts), with what the video got to */
function report(v: HTMLVideoElement, problem: string) {
    const state = `readyState ${v.readyState}, networkState ${v.networkState}, ${v.currentSrc.startsWith('blob:') ? 'local copy' : 'streamed'}`;
    void import('@sentry/browser').then((Sentry) =>
        Sentry.captureMessage(`score clip ${problem} (${state})`, 'warning')
    );
}
