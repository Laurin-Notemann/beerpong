import { useEffect, useRef, useState } from 'react';

import { frameOf, type ScoreClip } from '~/tv/lib/scoreClips';

/** a clip plays at most this long, whatever was uploaded */
const MAX_SECONDS = 10;
/**
 * The TV's video layer stays black for a while after the video says it plays (longer than 0.2 s)
 * and when it ends, so the first frame stays over it until it played this long, then fades into
 * it, and the last frame covers it this long before its end (seconds)
 */
const SHOWN_AT = 0.5;
const COVER_BEFORE_END = 0.2;
/** a clip that hasn't started by then is skipped */
const LOAD_TIMEOUT_MS = 8_000;
/**
 * how long the board takes to grow back over the clip (`.tv-board` in styles.css), and a little
 * more: releasing the TV's decoder costs a frame or two it would drop from the end
 */
const LEAVE_MS = 600;
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
 * Every live player's clips stay mounted in their 9:16 column behind the board. A score plays
 * the existing video; only that panel gets the classes that shrink the board aside. Idle panels
 * are invisible but laid out, and their first and last frame covers are already decoded.
 *
 * Tizen places its separate video layer where the video starts, so the column never animates.
 * All sources are server URLs (server/clips.ts), which that player can read (Sentry WEB-4).
 * Samsung has one decoder: idle videos use preload="none", and release it after playback so
 * they cannot steal it from the next clip or the camera. Other browsers buffer with preload="auto".
 */
export function ScoreClipPanel({
    clip,
    from,
    playId,
    singleDecoder,
    onDone,
}: {
    clip: Omit<ScoreClip, 'id'>;
    from: 'left' | 'right';
    /** the score being played; changing it replays the same mounted video */
    playId: string | undefined;
    singleDecoder: boolean;
    onDone: () => void;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const [open, setOpen] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [shown, setShown] = useState(false);
    const [frames, setFrames] = useState(true);
    const [side, setSide] = useState(from);
    const done = useRef(onDone);
    done.current = onDone;

    useEffect(() => {
        // A camera connecting or a remote layout change must not move a playing native layer.
        if (playId === undefined) setSide(from);
    }, [from, playId]);

    useEffect(() => {
        const v = video.current!;
        if (v.getAttribute('src') !== clip.url) v.src = clip.url;
        return () => {
            v.pause();
            v.removeAttribute('src');
            v.load();
        };
    }, [clip.url]);

    useEffect(() => {
        setOpen(false);
        setPlaying(false);
        setLeaving(false);
        setShown(false);
        if (playId === undefined) return;
        const v = video.current!;
        let stopped = false;
        let started = false;
        let finishing = false;
        let retried = false;
        let attempt = 0;
        let frame = 0;
        let cap: ReturnType<typeof setTimeout> | undefined;
        let leave: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
            if (stopped || finishing) return;
            finishing = true;
            setLeaving(true);
            // Keep playing under the last frame until the board covers the column again.
            leave = setTimeout(() => done.current(), LEAVE_MS);
        };
        const play = () => {
            const current = ++attempt;
            playVideo(v, () => stopped || finishing || current !== attempt, retry);
        };
        const retry = () => {
            if (stopped || finishing) return;
            if (retried) return finish();
            retried = true;
            report(v, 'preloaded video did not play; loading the server URL again');
            if (v.getAttribute('src') !== clip.url) v.src = clip.url;
            v.load();
            play();
        };
        const tick = () => {
            if (v.currentTime >= SHOWN_AT) setShown(true);
            const end = Math.min(v.duration || MAX_SECONDS, MAX_SECONDS) - COVER_BEFORE_END;
            if (v.currentTime >= end) finish();
            else frame = requestAnimationFrame(tick);
        };
        const onPlaying = () => {
            if (started || stopped || finishing) return;
            started = true;
            setPlaying(true);
            frame = requestAnimationFrame(tick);
            cap = setTimeout(finish, MAX_SECONDS * 1000);
        };
        const onError = () => {
            if (!v.getAttribute('src') || stopped || finishing) return;
            report(v, `error ${v.error?.code}`);
            retry();
        };
        v.addEventListener('playing', onPlaying);
        v.addEventListener('ended', finish);
        v.addEventListener('error', onError);
        // A frame lets the TV paint the stationary column and release the camera's decoder.
        const opening = requestAnimationFrame(() => {
            setOpen(true);
            v.muted = false;
            if (singleDecoder) {
                v.preload = 'auto';
                v.load();
            } else if (v.readyState >= HTMLMediaElement.HAVE_METADATA) v.currentTime = 0;
            play();
        });
        const fresh = setTimeout(() => {
            if (!started) retry();
        }, LOAD_TIMEOUT_MS / 2);
        const timeout = setTimeout(() => {
            if (started) return;
            report(v, `didn't start within ${LOAD_TIMEOUT_MS} ms`);
            finish();
        }, LOAD_TIMEOUT_MS);
        return () => {
            stopped = true;
            cancelAnimationFrame(opening);
            cancelAnimationFrame(frame);
            clearTimeout(fresh);
            clearTimeout(timeout);
            clearTimeout(cap);
            clearTimeout(leave);
            v.pause();
            if (singleDecoder) {
                // A paused native player still holds the decoder. Reattach without loading it.
                v.preload = 'none';
                v.removeAttribute('src');
                v.load();
                if (v.isConnected) v.src = clip.url;
            }
        };
    }, [playId, clip.url, singleDecoder]);

    return (
        <div
            className={`${playId !== undefined ? `score-clip from-${side}` : ''} ${open ? 'open' : ''} ${leaving ? 'leaving' : ''} absolute inset-y-0 py-[2.5rem] ${side === 'left' ? 'left-0 pl-[2.5rem]' : 'right-0 pr-[2.5rem]'}`}
            style={{ visibility: playId === undefined ? 'hidden' : 'visible' }}
        >
            <div
                className={`relative overflow-hidden rounded-[2rem] border-[0.4rem] ${clip.team === 'blue' ? 'border-blue bg-blue/20' : 'border-red bg-red/20'}`}
                // 9:16 from the height; `aspect-ratio` is too new for the TV's browser
                style={{ height: CLIP_HEIGHT, width: CLIP_WIDTH }}
            >
                <video
                    ref={video}
                    playsInline
                    src={clip.url}
                    preload={singleDecoder && playId === undefined ? 'none' : 'auto'}
                    className={`block h-full w-full object-contain ${playing ? 'bg-black' : ''}`}
                />
                {frames && (
                    <>
                        <img
                            src={frameOf(clip.url, 'first')}
                            alt=""
                            onError={() => setFrames(false)}
                            className={`clip-cover absolute inset-0 h-full w-full bg-black object-contain ${shown ? 'clip-cover-fade' : ''}`}
                        />
                        <img
                            src={frameOf(clip.url, 'last')}
                            alt=""
                            onError={() => setFrames(false)}
                            className={`clip-cover absolute inset-0 h-full w-full bg-black object-contain ${leaving ? '' : 'clip-cover-hidden'}`}
                        />
                    </>
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
    const state = `readyState ${v.readyState}, networkState ${v.networkState}, paused ${v.paused}`;
    void import('@sentry/browser').then((Sentry) =>
        Sentry.captureMessage(`score clip ${problem} (${state})`, 'warning')
    );
}

/** The TV allows sound; desktop browsers may require a muted retry. */
function playVideo(v: HTMLVideoElement, cancelled: () => boolean, onFailed: () => void) {
    v.play()
        .catch(() => {
            if (cancelled()) return;
            v.muted = true;
            return v.play();
        })
        .catch((err) => {
            if (cancelled()) return;
            report(v, `play() failed: ${err}`);
            onFailed();
        });
}
