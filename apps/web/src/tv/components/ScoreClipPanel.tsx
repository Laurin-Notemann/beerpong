import { useEffect, useRef, useState } from 'react';

import { noteFeed } from '~/tv/lib/feedTelemetry';
import { frameOf, type ScoreClip } from '~/tv/lib/scoreClips';

/** a clip plays at most this long, whatever was uploaded */
const MAX_SECONDS = 10;
/**
 * Tizen's separate video layer stays black after `playing` (longer than 0.2 s), so it still
 * needs 0.5 s of playback behind the full board. Other browsers wait for a painted video frame.
 * Only then does the board move aside; a cover fading into a different frame would flash.
 */
const TIZEN_SHOWN_AT = 0.5;
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
 * Idle native videos use preload="none" and release their resources after playback;
 * this limits idle players without interrupting the live camera. Other browsers buffer with preload="auto".
 */
export function ScoreClipPanel({
    clip,
    from,
    playId,
    nativeVideoLayer,
    onDone,
}: {
    clip: Omit<ScoreClip, 'id'>;
    from: 'left' | 'right';
    /** the score being played; changing it replays the same mounted video */
    playId: string | undefined;
    nativeVideoLayer: boolean;
    onDone: () => void;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const [open, setOpen] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [covered, setCovered] = useState(false);
    const [frames, setFrames] = useState(true);
    const [side, setSide] = useState(from);
    const done = useRef(onDone);
    useEffect(() => {
        done.current = onDone;
    }, [onDone]);

    // A camera connecting or a remote layout change must not move a playing native layer.
    if (playId === undefined && side !== from) setSide(from);
    const [previousPlayback, setPreviousPlayback] = useState({
        playId,
        url: clip.url,
        nativeVideoLayer,
    });
    if (
        previousPlayback.playId !== playId ||
        previousPlayback.url !== clip.url ||
        previousPlayback.nativeVideoLayer !== nativeVideoLayer
    ) {
        setPreviousPlayback({ playId, url: clip.url, nativeVideoLayer });
        setOpen(false);
        setPlaying(false);
        setLeaving(false);
        setCovered(false);
    }

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
        if (playId === undefined) return;
        const v = video.current!;
        const requestedAt = performance.now();
        let maxFrameGapMs = 0;
        let sampledAt = requestedAt;
        // Successful clip phases let camera warnings distinguish overlap from a load failure.
        const mark = (phase: string) => {
            const data = {
                playId,
                nativeVideoLayer,
                currentTime: v.currentTime,
                readyState: v.readyState,
                networkState: v.networkState,
                elapsedMs: Math.round(performance.now() - requestedAt),
                maxFrameGapMs: Math.round(maxFrameGapMs),
            };
            void import('@sentry/browser').then((Sentry) => {
                Sentry.addBreadcrumb({ category: 'score-clip', message: phase, data });
                // Every score, even without a camera: noteFeed throttles repeated notes for 5 s.
                Sentry.logger.info(`score clip ${phase}`, data);
            });
            // also next to the camera feed's stats, while one shows
            noteFeed(`score clip ${phase}`, { playId, nativeVideoLayer });
        };
        mark('requested');
        let stopped = false;
        let started = false;
        let finishing = false;
        let opened = false;
        let retried = false;
        let attempt = 0;
        let frame = 0;
        let revealFrame = 0;
        let finishFrame = 0;
        let videoFrame: number | undefined;
        let cap: ReturnType<typeof setTimeout> | undefined;
        let leave: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
            if (stopped || finishing) return;
            finishing = true;
            mark('finishing');
            if (!opened) return done.current();
            setCovered(true);
            // Paint the end cover before pausing. Decoder work and natural end must not
            // compete with the board's return; release resources only after it covers us.
            finishFrame = requestAnimationFrame(() => {
                finishFrame = requestAnimationFrame(() => {
                    if (stopped) return;
                    v.pause();
                    setLeaving(true);
                    mark('closing');
                    leave = setTimeout(() => done.current(), LEAVE_MS);
                });
            });
        };
        const play = () => {
            if (stopped || finishing) return;
            const current = ++attempt;
            playVideo(v, () => stopped || finishing || current !== attempt, retry);
        };
        const retry = () => {
            if (stopped || finishing) return;
            // A visible clip must close under its end cover rather than reload in view.
            if (started) return finish();
            if (retried) return finish();
            retried = true;
            report(v, 'preloaded video did not play; loading the server URL again');
            if (v.getAttribute('src') !== clip.url) v.src = clip.url;
            v.load();
            play();
        };
        const tick = () => {
            if (stopped) return;
            const now = performance.now();
            maxFrameGapMs = Math.max(maxFrameGapMs, now - sampledAt);
            sampledAt = now;
            if (!finishing) {
                const end = Math.min(v.duration || MAX_SECONDS, MAX_SECONDS) - COVER_BEFORE_END;
                if (v.currentTime >= end) finish();
                else if (nativeVideoLayer && v.currentTime >= TIZEN_SHOWN_AT) reveal();
            }
            frame = requestAnimationFrame(tick);
        };
        const reveal = () => {
            if (stopped || finishing || opened) return;
            opened = true;
            setOpen(true);
            mark('revealed');
        };
        const onPlaying = () => {
            if (started || stopped || finishing) return;
            started = true;
            sampledAt = performance.now();
            mark('playing');
            setPlaying(true);
            if (!nativeVideoLayer) {
                if (typeof v.requestVideoFrameCallback === 'function') {
                    videoFrame = v.requestVideoFrameCallback(reveal);
                } else {
                    // Older desktop browsers: give `playing` a paint before removing the cover.
                    revealFrame = requestAnimationFrame(() => {
                        revealFrame = requestAnimationFrame(reveal);
                    });
                }
            }
            frame = requestAnimationFrame(tick);
            cap = setTimeout(finish, MAX_SECONDS * 1000);
        };
        const onError = () => {
            if (!v.getAttribute('src') || stopped || finishing) return;
            report(v, `error ${v.error?.code}`);
            retry();
        };
        const onWaiting = () => mark('waiting');
        v.addEventListener('playing', onPlaying);
        v.addEventListener('ended', finish);
        v.addEventListener('error', onError);
        v.addEventListener('waiting', onWaiting);
        // A frame lets the TV paint the stationary column before playback starts.
        const opening = requestAnimationFrame(() => {
            v.muted = false;
            if (nativeVideoLayer) {
                v.preload = 'auto';
                v.load();
                // Warm Tizen's stationary native layer behind the full board.
            } else {
                if (v.readyState >= HTMLMediaElement.HAVE_METADATA) v.currentTime = 0;
            }
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
            mark('released');
            stopped = true;
            v.removeEventListener('playing', onPlaying);
            v.removeEventListener('ended', finish);
            v.removeEventListener('error', onError);
            v.removeEventListener('waiting', onWaiting);
            cancelAnimationFrame(opening);
            cancelAnimationFrame(frame);
            cancelAnimationFrame(revealFrame);
            cancelAnimationFrame(finishFrame);
            if (videoFrame !== undefined) v.cancelVideoFrameCallback(videoFrame);
            clearTimeout(fresh);
            clearTimeout(timeout);
            clearTimeout(cap);
            clearTimeout(leave);
            v.pause();
            if (nativeVideoLayer) {
                // Release the idle native player. Reattach without loading it.
                v.preload = 'none';
                v.removeAttribute('src');
                v.load();
                if (v.isConnected) v.src = clip.url;
            }
        };
    }, [playId, clip.url, nativeVideoLayer]);

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
                    preload={nativeVideoLayer && playId === undefined ? 'none' : 'auto'}
                    className={`block h-full w-full object-contain ${playing ? 'bg-black' : ''}`}
                />
                {frames && (
                    <>
                        <img
                            src={frameOf(clip.url, 'first')}
                            alt=""
                            onError={() => setFrames(false)}
                            className={`absolute inset-0 h-full w-full bg-black object-contain ${open ? 'clip-cover-hidden' : ''}`}
                        />
                        <img
                            src={frameOf(clip.url, 'last')}
                            alt=""
                            onError={() => setFrames(false)}
                            className={`absolute inset-0 h-full w-full bg-black object-contain ${covered ? '' : 'clip-cover-hidden'}`}
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
