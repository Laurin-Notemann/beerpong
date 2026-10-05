import { useEffect, useRef, useState } from 'react';

import { frameOf, type ScoreClip } from '~/tv/lib/scoreClips';

/** a clip plays at most this long, whatever was uploaded */
const MAX_SECONDS = 5;
/**
 * The TV's video layer is black for a moment after the video says it plays and when it ends, so
 * the first frame stays over it until it played this long, and the last frame covers it this long
 * before its end (seconds)
 */
const SHOWN_AT = 0.2;
const COVER_BEFORE_END = 0.2;
/** a clip that hasn't started by then is skipped */
const LOAD_TIMEOUT_MS = 8_000;
/** how long the board takes to grow back over the clip (`.tv-board` in styles.css) */
const LEAVE_MS = 350;
/** the full height of the screen, inside its padding */
const CLIP_HEIGHT = 'calc(100vh - 5rem)';
const CLIP_WIDTH = `calc((100vh - 5rem) * 9 / 16)`;

/**
 * How far the board shrinks to fit next to the clip's column (the clip and the padding on the
 * screen's edge). 1rem is 1/120 of the screen's width (styles.css).
 */
export function boardScale() {
    const rem = innerWidth / 120;
    const column = ((innerHeight - 5 * rem) * 9) / 16 + 2.5 * rem;
    return 1 - column / innerWidth;
}

/**
 * The scorer's clip in a 9:16 column on the `from` side of the screen, behind the board, which
 * shrinks aside to show it (Screen in routes/tv/index.tsx). Plays with sound; calls `onDone` once
 * the board covers it again.
 *
 * The TV plays video on a layer of its own behind the page, placed where the `<video>` is when it
 * starts; a video that moves while it starts stays black. So the column never moves and the clip
 * loads the moment it mounts, while the board is still moving aside. Images of its first and last
 * frame (preloaded with the board) cover it while it starts and stops, when that layer is black
 * for a moment. The clip streams from this server (server/clips.ts);
 * the TV's player fetches it itself, so it can't come from the page's memory or the browser's
 * cache (a blob: URL; Sentry WEB-4).
 */
export function ScoreClipPanel({
    clip,
    from,
    onDone,
}: {
    clip: ScoreClip;
    from: 'left' | 'right';
    onDone: () => void;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [shown, setShown] = useState(false);
    const [frames, setFrames] = useState(true);
    const done = useRef(onDone);
    done.current = onDone;

    useEffect(() => {
        const v = video.current!;
        v.src = clip.url;
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
        const timeout = setTimeout(() => {
            if (v.paused) {
                report(v, `didn't start within ${LOAD_TIMEOUT_MS} ms`);
                setLeaving(true);
            }
        }, LOAD_TIMEOUT_MS);
        return () => {
            clearTimeout(timeout);
            // the TV has one video decoder; the next clip gets it back
            v.removeAttribute('src');
            v.load();
        };
    }, [clip.url]);

    useEffect(() => {
        if (!playing) return;
        const v = video.current!;
        const end = Math.min(v.duration || MAX_SECONDS, MAX_SECONDS) - COVER_BEFORE_END;
        let frame = 0;
        const tick = () => {
            if (v.currentTime >= SHOWN_AT) setShown(true);
            if (v.currentTime >= end) setLeaving(true);
            else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        // in case it gets stuck
        const cap = setTimeout(() => setLeaving(true), MAX_SECONDS * 1000);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(cap);
        };
    }, [playing]);

    useEffect(() => {
        if (!leaving) return;
        // under a frame by now
        video.current!.pause();
        const timeout = setTimeout(() => done.current(), LEAVE_MS);
        return () => clearTimeout(timeout);
    }, [leaving]);

    const cover = !frames ? null : !shown ? 'first' : leaving ? 'last' : null;

    return (
        <div
            className={`score-clip from-${from} ${leaving ? 'leaving' : ''} absolute inset-y-0 py-[2.5rem] ${from === 'left' ? 'left-0 pl-[2.5rem]' : 'right-0 pr-[2.5rem]'}`}
        >
            <div
                className={`relative overflow-hidden rounded-[2rem] border-[0.4rem] ${clip.team === 'blue' ? 'border-blue bg-blue/20' : 'border-red bg-red/20'}`}
                // 9:16 from the height; `aspect-ratio` is too new for the TV's browser
                style={{ height: CLIP_HEIGHT, width: CLIP_WIDTH }}
            >
                <video
                    ref={video}
                    playsInline
                    preload="auto"
                    onPlaying={() => setPlaying(true)}
                    onEnded={() => setLeaving(true)}
                    onError={(e) => {
                        // emptied on purpose when the clip is done
                        if (!e.currentTarget.getAttribute('src')) return;
                        report(e.currentTarget, `error ${e.currentTarget.error?.code}`);
                        setLeaving(true);
                    }}
                    className={`block h-full w-full object-contain ${playing ? 'bg-black' : ''}`}
                />
                {cover && (
                    <img
                        key={cover}
                        src={frameOf(clip.url, cover)}
                        alt=""
                        onError={() => setFrames(false)}
                        className="absolute inset-0 h-full w-full bg-black object-contain"
                    />
                )}
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
    );
}

/** a clip that doesn't play goes to Sentry (sentry.ts), with what the video got to */
function report(v: HTMLVideoElement, problem: string) {
    const state = `readyState ${v.readyState}, networkState ${v.networkState}`;
    void import('@sentry/browser').then((Sentry) =>
        Sentry.captureMessage(`score clip ${problem} (${state})`, 'warning')
    );
}
