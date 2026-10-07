import { appearanceScore, ballAppearance, ballModel } from '~/tv/lib/ballClassifier';
import { cupVertices, type Cup, type PlayingArea } from '~/tv/lib/cupVision';

export interface BallCandidate {
    x: number;
    y: number;
    radius: number;
    color: 'orange' | 'white';
    score: number;
    source?: 'color-motion' | 'track-color-recovery' | 'static-color-appearance';
}
export interface HitEntry {
    id: string;
    matchId: string;
    seq: number;
    enteredAt: number;
    team: 'blue' | 'red';
    cupCount: number;
}
export interface HitObservation {
    entryId: string;
    matchId: string;
    status: 'candidate' | 'abstained';
    reason: string;
    /** Source-video coordinates; a candidate is not proof of a scored hit. */
    cup: { x: number; y: number } | null;
    secondsBeforeEntry: number | null;
    ballColor: 'orange' | 'white' | null;
}
interface Observation {
    at: number;
    balls: BallCandidate[];
    obscured: boolean;
}
interface Rims {
    at: number;
    cups: Cup[];
}
export const LOOKBACK_MS = 12_000;
interface TrackHint extends BallCandidate {
    previousX?: number;
    previousY?: number;
}

/** Motion is a proposal filter, not a semantic label: rings, hands and reflections can pass. */
export function ballCandidates(
    pixels: Uint8ClampedArray,
    previous: Uint8ClampedArray | null,
    width: number,
    height: number,
    areas?: PlayingArea[],
    hints: TrackHint[] = [],
    staticCandidates = false
) {
    // Identity proposals require a trained orange classifier and configured scene bounds.
    // White brightness alone never supplies static identity or flight evidence.
    if (staticCandidates && (!ballModel?.supportedColors.includes('orange') || !areas?.length))
        return { balls: [] as BallCandidate[], obscured: false };
    const mask = new Uint8Array(width * height);
    const scale = width / 640;
    let moving = 0;
    const bounds = areas?.length
        ? {
              left: Math.max(0, Math.min(...areas.map((a) => a.x)) - 0.05),
              right: Math.min(1, Math.max(...areas.map((a) => a.x + a.width)) + 0.05),
              top: Math.max(0, Math.min(...areas.map((a) => a.y)) - 0.1),
              bottom: Math.min(1, Math.max(...areas.map((a) => a.y + a.height)) + 0.1),
          }
        : null;
    for (let i = 0; i < mask.length; i++) {
        const p = i * 4,
            r = pixels[p],
            g = pixels[p + 1],
            b = pixels[p + 2];
        const motion = previous
            ? Math.abs(r - previous[p]) +
              Math.abs(g - previous[p + 1]) +
              Math.abs(b - previous[p + 2])
            : 0;
        if (motion > 70) moving++;
        if (!staticCandidates && motion < 70) continue;
        if (
            bounds &&
            (i % width < bounds.left * width ||
                i % width > bounds.right * width ||
                Math.floor(i / width) < bounds.top * height ||
                Math.floor(i / width) > bounds.bottom * height)
        )
            continue;
        const x = i % width,
            y = Math.floor(i / width);
        const strictOrange = r > 110 && g > 55 && r > g * 1.13 && g > b * 1.3 && r - b > 45;
        // Compression can turn a flying orange ball pink over a red rack. Relax color only
        // around an established moving track's prediction, never across the whole scene.
        const recoveredOrange =
            r > 110 &&
            g > 55 &&
            r > g * 1.13 &&
            r > b * 1.14 &&
            r - b > 30 &&
            hints.some(
                (h) =>
                    h.color === 'orange' &&
                    Math.hypot(x - h.x * width, y - h.y * height) < 24 * scale
            );
        const orange = strictOrange || recoveredOrange;
        if (staticCandidates && !strictOrange) continue;
        let white = Math.min(r, g, b) > 155 && Math.max(r, g, b) - Math.min(r, g, b) < 45;
        if (white && previous) {
            const pr = previous[p],
                pg = previous[p + 1],
                pb = previous[p + 2];
            // A table reveal lacks contrast; a real white ball crossing red/orange still has it.
            {
                let background = 0,
                    count = 0;
                const offset = Math.max(3, Math.round(6 * scale));
                for (const [dx, dy] of [
                    [-offset, 0],
                    [offset, 0],
                    [0, -offset],
                    [0, offset],
                ]) {
                    const sx = x + dx,
                        sy = y + dy;
                    if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
                    const q = (sy * width + sx) * 4;
                    background += (pixels[q] + pixels[q + 1] + pixels[q + 2]) / 3;
                    count++;
                }
                const contrast = count ? (r + g + b) / 3 - background / count : 0;
                const revealedOrange = pr > pg * 1.13 && pr - pb > 35;
                if (contrast < (revealedOrange ? 24 : 8)) white = false;
            }
        }
        if (orange || white) mask[i] = orange ? (strictOrange ? 1 : 3) : 2;
    }
    const balls: BallCandidate[] = [];
    let classifiedComponents = 0;
    const stack = new Int32Array(mask.length);
    for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        let tail = 1,
            size = 0,
            sumX = 0,
            sumY = 0,
            orange = 0,
            recovered = 0;
        let minX = width,
            maxX = 0,
            minY = height,
            maxY = 0;
        stack[0] = i;
        const visit = (p: number) => {
            if (mask[p]) {
                stack[tail++] = p;
                mask[p] = 0;
            }
        };
        orange += mask[i] !== 2 ? 1 : 0;
        recovered += mask[i] === 3 ? 1 : 0;
        mask[i] = 0;
        while (tail) {
            const p = stack[--tail],
                x = p % width,
                y = Math.floor(p / width);
            size++;
            sumX += x;
            sumY += y;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            for (const q of [
                x > 0 ? p - 1 : -1,
                x + 1 < width ? p + 1 : -1,
                y > 0 ? p - width : -1,
                y + 1 < height ? p + width : -1,
                x > 0 && y > 0 ? p - width - 1 : -1,
                x + 1 < width && y > 0 ? p - width + 1 : -1,
                x > 0 && y + 1 < height ? p + width - 1 : -1,
                x + 1 < width && y + 1 < height ? p + width + 1 : -1,
            ]) {
                if (q >= 0 && mask[q]) {
                    orange += mask[q] !== 2 ? 1 : 0;
                    recovered += mask[q] === 3 ? 1 : 0;
                    visit(q);
                }
            }
        }
        const w = maxX - minX + 1,
            h = maxY - minY + 1,
            fill = size / (w * h);
        // At 640 px, the ball is usually 3–14 px. Large connected hands are withheld.
        if (
            size < 4 * scale * scale ||
            size > 180 * scale * scale ||
            w > 25 * scale ||
            h > 25 * scale ||
            Math.max(w, h) / Math.min(w, h) > 3 ||
            fill < 0.25
        )
            continue;
        const color = orange > size / 2 ? 'orange' : 'white';
        if (staticCandidates && ++classifiedComponents > 64) break;
        let temporalRecovery = color === 'orange' && orange - recovered < 4 * scale * scale;
        let score = Math.min(0.75, fill);
        if (ballModel?.supportedColors.includes(color)) {
            score = appearanceScore(
                ballAppearance(
                    pixels,
                    width,
                    height,
                    sumX / size,
                    sumY / size,
                    Math.max(w, h) / 2,
                    ballModel.features
                ),
                ballModel
            );
            if (score < ballModel.threshold) {
                // A blurred ball over a red rack can lose its appearance score. Keep only
                // current moving orange pixels near an accepted track, for at most two
                // weak frames. Preserve the model's score so this is observable recovery.
                if (
                    color !== 'orange' ||
                    !hints.some(
                        (hint) =>
                            hint.color === 'orange' &&
                            Math.hypot(
                                sumX / size - hint.x * width,
                                sumY / size - hint.y * height
                            ) <
                                24 * scale
                    )
                )
                    continue;
                temporalRecovery = true;
            }
        }
        balls.push({
            x: sumX / size / width,
            y: sumY / size / height,
            radius: Math.max(w, h) / width / 2,
            color,
            score,
            source: staticCandidates
                ? 'static-color-appearance'
                : temporalRecovery
                  ? 'track-color-recovery'
                  : 'color-motion',
        });
        if (balls.length >= (staticCandidates ? 12 : 24)) break;
    }
    // A compression fringe can split into several orange components. One prediction
    // supports one observation; otherwise those fragments create competing tracks.
    const recoveredObservations = new Set<number>();
    const strongClaims = hints
        .flatMap((hint, hintIndex) =>
            balls.map((ball, ballIndex) => ({
                hintIndex,
                ballIndex,
                distance:
                    hint.previousX !== undefined &&
                    hint.previousY !== undefined &&
                    ball.color === hint.color &&
                    ball.source === 'color-motion'
                        ? Math.hypot(
                              (ball.x - hint.previousX) * width,
                              (ball.y - hint.previousY) * height
                          )
                        : Infinity,
            }))
        )
        .filter((claim) => claim.distance < width * 0.15)
        .sort((a, b) => a.distance - b.distance);
    const claimedHints = new Set<number>(),
        claimedBalls = new Set<number>();
    for (const claim of strongClaims) {
        if (claimedHints.has(claim.hintIndex) || claimedBalls.has(claim.ballIndex)) continue;
        claimedHints.add(claim.hintIndex);
        claimedBalls.add(claim.ballIndex);
    }
    for (const [hintIndex, hint] of hints.entries()) {
        // A bounce can move the real ball away from its prediction. A strong observation
        // claims one track; that track's old prediction cannot add another object.
        if (claimedHints.has(hintIndex)) continue;
        const nearby = balls
            .map((ball, index) => ({
                ball,
                index,
                distance: Math.hypot((ball.x - hint.x) * width, (ball.y - hint.y) * height),
            }))
            .filter((entry) => entry.ball.color === hint.color && entry.distance < 24 * scale)
            .sort(
                (a, b) =>
                    Number(a.ball.source === 'track-color-recovery') -
                        Number(b.ball.source === 'track-color-recovery') || a.distance - b.distance
            );
        if (nearby[0]) recoveredObservations.add(nearby[0].index);
    }
    return {
        balls: balls.filter(
            (ball, index) =>
                ball.source !== 'track-color-recovery' || recoveredObservations.has(index)
        ),
        obscured: moving / mask.length > 0.12,
    };
}

/** Conservative temporal color recovery. Predicted positions never become detections without pixels. */
export class BallTracker {
    private tracks: { points: (BallCandidate & { at: number })[] }[] = [];
    detect(
        pixels: Uint8ClampedArray,
        previous: Uint8ClampedArray | null,
        width: number,
        height: number,
        areas: PlayingArea[] | undefined,
        at: number
    ) {
        if (!previous) this.tracks = [];
        this.tracks = this.tracks.filter((t) => at - t.points.at(-1)!.at <= 180);
        const hints = this.tracks.flatMap((t) => {
            if (t.points.length < 2 || t.points.every((p) => p.source === 'track-color-recovery'))
                return [];
            const a = t.points.at(-2)!,
                b = t.points.at(-1)!;
            const distance = Math.hypot((b.x - a.x) * width, (b.y - a.y) * height);
            if (b.color !== 'orange' || distance < (18 * width) / 640 || b.at <= a.at) return [];
            const ratio = (at - b.at) / (b.at - a.at);
            return [
                {
                    ...b,
                    previousX: b.x,
                    previousY: b.y,
                    x: b.x + (b.x - a.x) * ratio,
                    y: b.y + (b.y - a.y) * ratio,
                },
            ];
        });
        const result = ballCandidates(pixels, previous, width, height, areas, hints);
        const identities = ballCandidates(pixels, null, width, height, areas, [], true);
        const complete = {
            ...result,
            balls: [
                ...result.balls,
                ...identities.balls.filter(
                    (identity) =>
                        !result.balls.some(
                            (moving) =>
                                moving.color === identity.color &&
                                Math.hypot(
                                    (moving.x - identity.x) * width,
                                    (moving.y - identity.y) * height
                                ) < Math.max(9 * (width / 640), identity.radius * width)
                        )
                ),
            ].slice(0, 24),
        };
        if (result.obscured) {
            this.tracks = [];
            return complete;
        }
        const used = new Set<number>();
        for (const ball of result.balls) {
            const possible = this.tracks
                .map((t, index) => ({
                    t,
                    index,
                    d: Math.hypot(
                        (t.points.at(-1)!.x - ball.x) * width,
                        (t.points.at(-1)!.y - ball.y) * height
                    ),
                }))
                .filter(
                    (t) =>
                        !used.has(t.index) &&
                        t.t.points.at(-1)!.at < at &&
                        t.t.points.at(-1)!.color === ball.color &&
                        t.d < width * 0.15
                )
                .sort((a, b) => a.d - b.d);
            if (possible.length > 1 && possible[1].d - possible[0].d < width * 0.015) continue;
            const found = possible[0];
            if (found) {
                found.t.points.push({ ...ball, at });
                found.t.points = found.t.points.slice(-2);
                used.add(found.index);
            } else this.tracks.push({ points: [{ ...ball, at }] });
        }
        this.tracks = this.tracks.slice(-24);
        return complete;
    }
}

function rim(cup: Cup) {
    const vertices = cupVertices(cup);
    const low = Math.min(...vertices.map((p) => p[1])),
        high = Math.max(...vertices.map((p) => p[1]));
    const top = vertices.filter((p) => p[1] < low + (high - low) * 0.3);
    if (!top.length) return null;
    const left = Math.min(...top.map((p) => p[0])),
        right = Math.max(...top.map((p) => p[0]));
    return { x: (left + right) / 2, y: low + (high - low) * 0.12, radius: (right - left) / 2 };
}

/** Bounded metadata history. No frames are retained or uploaded by hit recognition. */
export class BallHistory {
    private observations: Observation[] = [];
    private rims: Rims[] = [];
    add(at: number, balls: BallCandidate[], obscured: boolean) {
        this.observations.push({ at, balls, obscured });
        this.observations = this.observations
            .filter((o) => o.at >= at - LOOKBACK_MS * 2 - 3000)
            .slice(-450);
        this.rims = this.rims.filter((o) => o.at >= at - LOOKBACK_MS * 2 - 3000).slice(-40);
    }
    cups(at: number, cups: Cup[]) {
        this.rims.push({ at, cups });
        this.rims = this.rims.slice(-40);
    }
    analyze(entry: HitEntry, area: PlayingArea, now: number, aspect: number): HitObservation {
        const result = (reason: string): HitObservation => ({
            entryId: entry.id,
            matchId: entry.matchId,
            status: 'abstained',
            reason,
            cup: null,
            secondsBeforeEntry: null,
            ballColor: null,
        });
        if (entry.cupCount !== 1) return result('multiple-cups-entered');
        if (entry.enteredAt > now + 2000 || now - entry.enteredAt > LOOKBACK_MS)
            return result('entry-outside-history');
        const start = entry.enteredAt - LOOKBACK_MS;
        const history = this.observations.filter((o) => o.at >= start && o.at <= entry.enteredAt);
        if (!history.length || history[0].at > start + 1000) return result('incomplete-lookback');
        if (
            entry.enteredAt - history[history.length - 1].at > 350 ||
            history.some((o, i) => i > 0 && o.at - history[i - 1].at > 350)
        )
            return result('video-sampling-gap');
        const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
            Math.hypot((a.x - b.x) * aspect, a.y - b.y);
        let tracks: { points: (BallCandidate & { at: number })[]; last: number }[] = [];
        const hits: { cup: { x: number; y: number }; at: number; color: 'orange' | 'white' }[] = [];
        for (const o of history) {
            tracks = tracks.filter((track) => o.at - track.last <= 220);
            if (o.obscured) continue;
            const used = new Set<number>();
            for (const ball of o.balls) {
                if (ball.source === 'static-color-appearance') continue;
                const candidates = tracks
                    .map((track, index) => ({
                        track,
                        index,
                        d: distance(track.points[track.points.length - 1], ball),
                    }))
                    .filter(
                        (t) =>
                            !used.has(t.index) &&
                            o.at > t.track.last &&
                            o.at - t.track.last <= 220 &&
                            t.d < 0.15 &&
                            t.track.points[t.track.points.length - 1].color === ball.color
                    )
                    .sort((a, b) => a.d - b.d);
                // A crossing/ambiguous association does not establish a trajectory.
                if (candidates.length > 1 && candidates[1].d - candidates[0].d < 0.015) continue;
                const found = candidates[0];
                const track = found?.track ?? { points: [], last: o.at };
                if (!found) tracks.push(track);
                else used.add(found.index);
                track.points.push({ ...ball, at: o.at });
                track.last = o.at;
                track.points = track.points.slice(-6);
                if (track.points.length < 3) continue;
                const first = track.points[0];
                if (o.at - first.at > 500 || distance(first, ball) < 0.025) continue;
                const cups = this.rims.filter((r) => r.at <= o.at && o.at - r.at < 1200).at(-1);
                const targets = (cups?.cups ?? [])
                    .map(rim)
                    .filter(
                        (r): r is NonNullable<typeof r> =>
                            !!r &&
                            r.x >= area.x &&
                            r.x <= area.x + area.width &&
                            r.y >= area.y &&
                            r.y <= area.y + area.height
                    )
                    .filter(
                        (r) =>
                            distance(r, ball) < r.radius * aspect * 0.8 &&
                            distance(r, first) > distance(r, ball) + 0.02
                    );
                if (targets.length === 1)
                    hits.push({ cup: targets[0], at: o.at, color: ball.color });
            }
        }
        const distinct = hits.filter(
            (hit, i) =>
                !hits
                    .slice(0, i)
                    .some((h) => distance(h.cup, hit.cup) < 0.02 && Math.abs(h.at - hit.at) < 1000)
        );
        if (distinct.length !== 1)
            return result(distinct.length ? 'ambiguous-trajectories' : 'no-ball-to-rim-evidence');
        const hit = distinct[0];
        return {
            ...result('moving-ball-near-rim'),
            status: 'candidate',
            cup: { x: hit.cup.x, y: hit.cup.y },
            secondsBeforeEntry: (entry.enteredAt - hit.at) / 1000,
            ballColor: hit.color,
        };
    }
}
