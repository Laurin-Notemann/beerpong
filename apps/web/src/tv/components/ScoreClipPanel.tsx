import { useEffect, useRef, useState } from 'react';

import type { ScoreClip } from '~/tv/lib/scoreClips';

/** a clip plays at most this long, whatever was uploaded */
const MAX_SECONDS = 5;
/** a clip that hasn't started by then is skipped */
const LOAD_TIMEOUT_MS = 8_000;
/** how long the column takes to open and close (`.score-clip` in styles.css) */
const OPEN_MS = 450;
const LEAVE_MS = 350;
/** the full height of the screen, inside its padding */
const CLIP_HEIGHT = 'calc(100vh - 5rem)';
const CLIP_WIDTH = `calc((100vh - 5rem) * 9 / 16)`;

/**
 * The scorer's clip in a 9:16 column that opens on the `from` side of the screen and pushes the
 * board aside, so nothing is covered. Plays with sound; calls `onDone` once the column closed
 * again.
 *
 * The TV plays video on a layer of its own behind the page, placed where the `<video>` is when it
 * starts. A video that starts while the column still moves stays black, so the column opens with
 * the scorer's name and the clip only loads once it stands still. The clip streams from this
 * server (server/clips.ts), which prepared it when the match showed the player; the TV's player
 * can't open a copy in the page's memory (a blob: URL; Sentry WEB-4).
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
    const [open, setOpen] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const done = useRef(onDone);
    done.current = onDone;

    useEffect(() => {
        const timeout = setTimeout(() => setOpen(true), OPEN_MS);
        // the TV has one video decoder; the next clip gets it back
        const v = video.current!;
        return () => {
            clearTimeout(timeout);
            v.removeAttribute('src');
            v.load();
        };
    }, []);

    useEffect(() => {
        if (!open) return;
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
        return () => clearTimeout(timeout);
    }, [open, clip.url]);

    useEffect(() => {
        if (!playing) return;
        const cap = setTimeout(() => setLeaving(true), MAX_SECONDS * 1000);
        return () => clearTimeout(cap);
    }, [playing]);

    useEffect(() => {
        if (!leaving) return;
        // stopped before the column moves, so the video's layer doesn't stay behind
        video.current!.pause();
        const timeout = setTimeout(() => done.current(), LEAVE_MS);
        return () => clearTimeout(timeout);
    }, [leaving]);

    return (
        // the column's width opens and closes (styles.css); the clip keeps its size and stays on
        // the board's side of it, so it slides in from the edge of the screen
        <div
            className={`score-clip ${leaving ? 'leaving' : ''} relative z-10 flex shrink-0 overflow-hidden ${from === 'left' ? 'justify-end' : ''}`}
            style={{ width: `calc(${CLIP_WIDTH} + 2.5rem)` }}
        >
            <div
                className={`shrink-0 py-[2.5rem] ${from === 'left' ? 'pl-[2.5rem]' : 'pr-[2.5rem]'}`}
            >
                <div
                    className={`relative overflow-hidden rounded-[2rem] border-[0.4rem] ${clip.team === 'blue' ? 'border-blue bg-blue/20' : 'border-red bg-red/20'}`}
                    // 9:16 from the height; `aspect-ratio` is too new for the TV's browser
                    style={{ height: CLIP_HEIGHT, width: CLIP_WIDTH }}
                >
                    {/* until the clip plays: the scorer's name */}
                    {!playing && (
                        <div className="absolute inset-0 grid place-items-center px-[2rem] text-center text-[4.4rem] leading-[1.1] font-black break-words">
                            {clip.name}
                        </div>
                    )}
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
                        className={`relative block h-full w-full object-contain ${playing ? 'bg-black' : ''}`}
                    />
                    {playing && (
                        <div
                            className="absolute right-0 bottom-0 left-0 truncate px-[1.6rem] pt-[4rem] pb-[1.4rem] text-[2.4rem] font-black"
                            style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                            }}
                        >
                            {clip.name}
                        </div>
                    )}
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
