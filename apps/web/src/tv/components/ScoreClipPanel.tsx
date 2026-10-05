import { useEffect, useRef, useState } from 'react';

import type { ScoreClip } from '~/tv/lib/scoreClips';

/** a clip plays at most this long, whatever was uploaded */
const MAX_SECONDS = 5;
/** a clip that hasn't started by then is skipped */
const LOAD_TIMEOUT_MS = 8_000;
/** how long the column takes to close (`.score-clip.leaving` in styles.css) */
const LEAVE_MS = 350;
/** the full height of the screen, inside its padding */
const CLIP_HEIGHT = 'calc(100vh - 5rem)';
const CLIP_WIDTH = `calc((100vh - 5rem) * 9 / 16)`;

/**
 * The scorer's clip in a 9:16 column that opens on the `from` side of the screen and pushes the
 * board aside, so nothing is covered. The clip loads hidden and the column only opens once it
 * plays, so it's never black. Plays with sound; calls `onDone` once the column closed again.
 *
 * The clip streams from this server (server/clips.ts), which prepared it when the match showed
 * the player. The TV's player can't open a copy in the page's memory (a blob: URL; Sentry WEB-4).
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
    }, []);

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
        // a clip that never played never opened the column
        const timeout = setTimeout(() => done.current(), playing ? LEAVE_MS : 0);
        return () => clearTimeout(timeout);
    }, [leaving, playing]);

    return (
        // the column's width opens and closes (styles.css); the clip keeps its size and stays on
        // the board's side of it, so it slides in from the edge of the screen
        <div
            className={`${playing ? 'score-clip' : ''} ${leaving ? 'leaving' : ''} flex shrink-0 overflow-hidden ${from === 'left' ? 'justify-end' : 'order-last'}`}
            style={{ width: playing ? `calc(${CLIP_WIDTH} + 2.5rem)` : 0 }}
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
                        src={clip.url}
                        playsInline
                        preload="auto"
                        onPlaying={() => setPlaying(true)}
                        onEnded={() => setLeaving(true)}
                        onError={(e) => {
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
    const state = `readyState ${v.readyState}, networkState ${v.networkState}`;
    void import('@sentry/browser').then((Sentry) =>
        Sentry.captureMessage(`score clip ${problem} (${state})`, 'warning')
    );
}
