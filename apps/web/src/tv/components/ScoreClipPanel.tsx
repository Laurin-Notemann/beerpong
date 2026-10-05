import { useEffect, useRef, useState } from 'react';

import type { ScoreClip } from '~/tv/lib/scoreClips';

/** a clip plays at most this long, whatever was uploaded */
const MAX_SECONDS = 5;
/** a clip that hasn't started by then is skipped */
const LOAD_TIMEOUT_MS = 8_000;
/** how long the panel takes to slide out (`.score-clip.leaving` in styles.css) */
const LEAVE_MS = 350;

/**
 * The scorer's clip in a 9:16 panel that slides in from `from` over the board and leaves the rest
 * of it visible. Plays with sound; calls `onDone` once it slid out again.
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
            .catch(() => setLeaving(true));
        const timeout = setTimeout(() => setLeaving(true), LOAD_TIMEOUT_MS);
        return () => clearTimeout(timeout);
    }, []);

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
        <div
            className={`score-clip score-clip-${from} ${leaving ? 'leaving' : ''} fixed top-[9vh] z-50 overflow-hidden rounded-[2rem] border-[0.4rem] bg-black shadow-[0_2rem_6rem_rgba(0,0,0,0.7)] ${clip.team === 'blue' ? 'border-blue' : 'border-red'}`}
            // 9:16 from the height; `aspect-ratio` is too new for the TV's browser
            style={{ height: '82vh', width: 'calc(82vh * 9 / 16)' }}
        >
            <video
                ref={video}
                src={clip.url}
                playsInline
                preload="auto"
                onPlaying={() => setPlaying(true)}
                onEnded={() => setLeaving(true)}
                onError={() => setLeaving(true)}
                className="block h-full w-full object-contain"
            />
            <div
                className="absolute right-0 bottom-0 left-0 truncate px-[1.6rem] pt-[4rem] pb-[1.4rem] text-[2.4rem] font-black"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
            >
                {clip.name}
            </div>
        </div>
    );
}
