import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { ballDebugStats } from '~/tv/lib/ballGeometry';
import { cupDebugStats } from '~/tv/lib/cupVision';
import { useNow } from '~/tv/lib/hooks';
import { getCameraVisionDebug } from '~/tv/server/cameraVision';

/** Opt-in observer diagnostics; opening this panel does not change camera or match settings. */
export function VisionDebug({
    id,
    secret,
    stream,
}: {
    id: string;
    secret: string;
    stream: MediaStream | null;
}) {
    const [areasVisible, setAreasVisible] = useState(true);
    const [closed, setClosed] = useState(false);
    const now = useNow(500);
    const query = useQuery({
        queryKey: ['vision-debug', id],
        queryFn: () => getCameraVisionDebug({ data: { id, key: secret } }),
        refetchInterval: closed ? false : 3000,
        enabled: !closed,
    });
    if (closed) return null;
    const data = query.data;
    const state = data?.state;
    const cups = stream ? cupDebugStats(stream) : null;
    const balls = stream ? ballDebugStats(stream) : null;
    const age = data ? Math.max(0, Math.round((now - data.reportedAt) / 1000)) : null;
    const width = state?.width || 1280;
    const height = state?.height || 720;
    const rotation = data?.config.cameraRotation ?? 0;
    const sideways = rotation === 90 || rotation === 270;
    const shownWidth = sideways ? height : width;
    const shownHeight = sideways ? width : height;
    const mirror = data?.config.cameraVideoFlipped;
    return (
        <>
            {areasVisible && state?.areas && (
                <svg
                    aria-label="Calibrated playing areas"
                    className="pointer-events-none fixed inset-0 z-40 h-full w-full"
                    viewBox={`0 0 ${shownWidth} ${shownHeight}`}
                >
                    <g transform={mirror ? `translate(${shownWidth} 0) scale(-1 1)` : undefined}>
                        <g
                            transform={`translate(${shownWidth / 2} ${shownHeight / 2}) rotate(${rotation}) translate(${-width / 2} ${-height / 2})`}
                        >
                            {state.areas.map((area, i) => (
                                <rect
                                    key={i}
                                    x={area.x * width}
                                    y={area.y * height}
                                    width={area.width * width}
                                    height={area.height * height}
                                    fill="none"
                                    stroke={i === 0 ? '#59bfff' : '#ffbd59'}
                                    strokeWidth="2"
                                    strokeDasharray="8 5"
                                />
                            ))}
                        </g>
                    </g>
                </svg>
            )}
            <aside
                aria-label="Live vision debug"
                className="fixed top-3 right-3 z-50 w-[23rem] max-w-[90vw] rounded-xl border border-white/20 bg-black/90 p-4 text-sm text-white shadow-xl"
            >
                <div className="mb-3 flex items-center justify-between gap-3">
                    <strong>Live vision debug</strong>
                    <button
                        type="button"
                        aria-label="Close vision debug"
                        onClick={() => setClosed(true)}
                    >
                        Close
                    </button>
                </div>
                {query.isError ? (
                    <p role="status">Camera diagnostics unavailable. Retrying…</p>
                ) : !state ? (
                    <p>Waiting for camera report…</p>
                ) : (
                    <div className="space-y-2">
                        <p>
                            {data?.name} · report {age}s ago
                            {age !== null && age > 15 ? ' · stale' : ''}
                        </p>
                        <p>
                            Cup outlines: <strong>{state.enabled ? 'on' : 'off'}</strong>
                        </p>
                        <p>{state.status}</p>
                        <p>
                            TV contours: {cups?.count ?? 'no packet'}
                            {cups ? ` · ${cups.ageMs}ms old` : ''}
                        </p>
                        <p>
                            Ball tracking: <strong>{state.ballEnabled ? 'on' : 'off'}</strong>
                        </p>
                        <p>
                            TV ball candidates: {balls?.count ?? 'no packet'}
                            {balls ? ` · ${balls.ageMs}ms old` : ''}
                        </p>
                        <p>Hit match: {state.hitMatchId || state.syncMatchId || 'none selected'}</p>
                        <p>{state.syncStatus}</p>
                        <p>
                            Recording: {state.recording ? 'on' : 'off'} · pending uploads{' '}
                            {state.pendingUploads}
                        </p>
                        {state.ballHit && (
                            <p>
                                Lookback: {state.ballHit.status} · {state.ballHit.reason}
                            </p>
                        )}
                        {data?.commandPending && <p>Camera setting change pending…</p>}
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={areasVisible}
                                onChange={(e) => setAreasVisible(e.target.checked)}
                            />
                            Show playing-area boundaries
                        </label>
                        <p className="text-xs text-white/60">
                            Candidate circles are observations, not confirmed hits. Feedback never
                            changes the score.
                        </p>
                    </div>
                )}
            </aside>
        </>
    );
}
