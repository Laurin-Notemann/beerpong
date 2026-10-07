import type { BallCandidate } from '~/tv/lib/ballVision';

export const BALL_CHANNEL = 'versus-balls-v1';
const MAX_AGE = 600;
export interface BallFrame {
    version: 1;
    enabled: boolean;
    /** Camera-clock epoch; a mapping/reset invalidates older hit highlights. */
    since: number;
    model: string;
    sequence: number;
    ageMs: number;
    balls: BallCandidate[];
}

/** Untrusted peer geometry is bounded; no inference or image data reaches the TV. */
export function parseBallFrame(raw: unknown): BallFrame | null {
    if (typeof raw !== 'string' || raw.length > 6000) return null;
    try {
        const v = JSON.parse(raw) as BallFrame;
        if (
            !v ||
            v.version !== 1 ||
            typeof v.enabled !== 'boolean' ||
            !Number.isSafeInteger(v.since) ||
            v.since < 0 ||
            v.since > 1e15 ||
            typeof v.model !== 'string' ||
            v.model.length > 100 ||
            !Number.isSafeInteger(v.sequence) ||
            v.sequence < 0 ||
            !Number.isFinite(v.ageMs) ||
            v.ageMs < 0 ||
            v.ageMs > MAX_AGE ||
            !Array.isArray(v.balls) ||
            v.balls.length > 24
        )
            return null;
        for (const b of v.balls) {
            if (
                !b ||
                ![b.x, b.y, b.radius, b.score].every(
                    (n) => typeof n === 'number' && Number.isFinite(n)
                ) ||
                b.x < 0 ||
                b.x > 1 ||
                b.y < 0 ||
                b.y > 1 ||
                b.radius <= 0 ||
                b.radius > 0.05 ||
                b.score < 0 ||
                b.score > 1 ||
                (b.color !== 'orange' && b.color !== 'white') ||
                !['color-motion', 'track-color-recovery', 'static-color-appearance'].includes(
                    b.source ?? ''
                )
            )
                return null;
        }
        return v;
    } catch {
        return null;
    }
}
const frames = new WeakMap<MediaStream, { value: BallFrame; received: number }>();
export function receiveBalls(stream: MediaStream, value: BallFrame, now = performance.now()) {
    const prior = frames.get(stream);
    if (prior && prior.value.sequence >= value.sequence) return false;
    frames.set(stream, { value, received: now });
    return true;
}
export function clearBalls(stream: MediaStream) {
    frames.delete(stream);
}
export function ballDebugStats(stream: MediaStream) {
    const frame = frames.get(stream);
    return frame
        ? {
              count: frame.value.balls.length,
              sequence: frame.value.sequence,
              model: frame.value.model,
              enabled: frame.value.enabled,
              ageMs: Math.round(performance.now() - frame.received + frame.value.ageMs),
          }
        : null;
}
export function ballAssistanceEnabled(
    stream: MediaStream,
    now = performance.now(),
    occurredAt?: string
) {
    const frame = frames.get(stream);
    return (
        !!frame &&
        frame.value.enabled &&
        (occurredAt === undefined || Date.parse(occurredAt) >= frame.value.since) &&
        now - frame.received + frame.value.ageMs <= MAX_AGE
    );
}
export function drawBalls(
    context: CanvasRenderingContext2D,
    stream: MediaStream,
    now: number,
    size: { width: number; height: number }
) {
    const frame = frames.get(stream);
    if (!frame || now - frame.received + frame.value.ageMs > MAX_AGE) return;
    context.save();
    context.lineWidth = Math.max(1.5, size.width / 640);
    for (const ball of frame.value.balls) {
        context.strokeStyle = ball.color === 'orange' ? '#ffbf64' : '#ffffff';
        context.setLineDash(ball.source === 'static-color-appearance' ? [3, 3] : []);
        context.beginPath();
        // Radius is measured in source width units, including after portrait rotation.
        context.arc(
            ball.x * size.width,
            ball.y * size.height,
            Math.max(3, ball.radius * size.width),
            0,
            Math.PI * 2
        );
        context.stroke();
    }
    context.restore();
}
