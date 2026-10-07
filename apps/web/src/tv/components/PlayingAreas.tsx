import { useEffect, useRef, useState, type RefObject } from 'react';

import { validAreas, type PlayingArea } from '~/tv/lib/cupVision';

/** Calibrate on an uncropped camera frame, so the zones use the same coordinates as the TV. */
export function PlayingAreas({
    video,
    initial,
    save,
    cancel,
    remove,
}: {
    video: RefObject<HTMLVideoElement | null>;
    initial: PlayingArea[] | null;
    save: (areas: [PlayingArea, PlayingArea]) => void;
    cancel: () => void;
    remove: () => void;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const start = useRef<[number, number] | null>(null);
    const [areas, setAreas] = useState<PlayingArea[]>(initial ?? []);
    const [draft, setDraft] = useState<PlayingArea | null>(null);
    const [size, setSize] = useState({ width: 1280, height: 720 });
    const [error, setError] = useState('');
    useEffect(() => {
        const v = video.current;
        const surface = canvas.current;
        if (!v?.videoWidth || !surface) {
            setError('Wait for the camera picture, then reopen playing areas.');
            return;
        }
        surface.width = v.videoWidth;
        surface.height = v.videoHeight;
        surface.getContext('2d')?.drawImage(v, 0, 0);
        setSize({ width: v.videoWidth, height: v.videoHeight });
    }, [video]);
    useEffect(() => {
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') cancel();
        };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [cancel]);
    const point = (event: React.PointerEvent<SVGSVGElement>): [number, number] => {
        const r = event.currentTarget.getBoundingClientRect();
        return [
            Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)),
            Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)),
        ];
    };
    const rect = ([x, y]: [number, number], [ex, ey]: [number, number]): PlayingArea => ({
        x: Math.min(x, ex),
        y: Math.min(y, ey),
        width: Math.abs(x - ex),
        height: Math.abs(y - ey),
    });
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="playing-title"
            className="absolute inset-0 z-20 flex flex-col bg-black/95 p-4 sm:p-6"
        >
            <h2 id="playing-title" className="text-xl font-bold">
                Select the playing formations
            </h2>
            <p className="mt-1 text-sm text-text-2">
                Drag a box around each team’s cups, with room to rearrange them. Keep spare cups and
                drinks outside. Redo this if the camera moves.
            </p>
            <div className="my-4 flex min-h-0 flex-1 items-center justify-center overflow-auto">
                <div
                    className="relative w-full max-w-5xl shrink-0"
                    style={{ aspectRatio: `${size.width}/${size.height}` }}
                >
                    <canvas ref={canvas} className="block h-full w-full" />
                    <svg
                        viewBox="0 0 1000 1000"
                        preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full touch-none"
                        aria-label="Draw two playing areas"
                        onPointerDown={(event) => {
                            if (areas.length >= 2 || error) return;
                            start.current = point(event);
                            event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onPointerMove={(event) => {
                            if (start.current) setDraft(rect(start.current, point(event)));
                        }}
                        onPointerUp={(event) => {
                            if (!start.current) return;
                            const a = rect(start.current, point(event));
                            start.current = null;
                            setDraft(null);
                            if (a.width >= 0.02 && a.height >= 0.02) setAreas((old) => [...old, a]);
                        }}
                        onPointerCancel={() => {
                            start.current = null;
                            setDraft(null);
                        }}
                    >
                        {[...areas, ...(draft ? [draft] : [])].map((a, i) => (
                            <g key={i}>
                                <rect
                                    key={i}
                                    x={a.x * 1000}
                                    y={a.y * 1000}
                                    width={a.width * 1000}
                                    height={a.height * 1000}
                                    fill="rgba(110,255,218,0.12)"
                                    stroke="#6effda"
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <text
                                    x={a.x * 1000 + 8}
                                    y={a.y * 1000 + 35}
                                    fill="#6effda"
                                    fontSize="30"
                                >
                                    {i + 1}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>
            <p role="status" className="text-sm text-text-2">
                {error ||
                    (areas.length === 2
                        ? validAreas(areas)
                            ? 'Both formations selected.'
                            : 'Areas must be separate. Clear and draw again.'
                        : `Select formation ${areas.length + 1} of 2.`)}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
                {initial && (
                    <button
                        type="button"
                        className="min-h-11 rounded-xl bg-panel px-4 font-semibold"
                        onClick={remove}
                    >
                        Remove saved areas
                    </button>
                )}
                <button
                    type="button"
                    className="min-h-11 rounded-xl bg-live px-4 font-semibold text-black disabled:opacity-40"
                    disabled={!!error || !validAreas(areas)}
                    onClick={() => {
                        if (validAreas(areas)) save(areas);
                    }}
                >
                    Save playing areas
                </button>
                <button
                    type="button"
                    className="min-h-11 rounded-xl bg-panel px-4 font-semibold"
                    onClick={() => setAreas([])}
                >
                    Clear areas
                </button>
                <button
                    type="button"
                    className="min-h-11 rounded-xl bg-panel px-4 font-semibold"
                    onClick={cancel}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
