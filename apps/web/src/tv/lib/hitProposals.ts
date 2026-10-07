import { ballRim, type BallCandidate } from '~/tv/lib/ballVision';
import type { Cup } from '~/tv/lib/cupVision';
import { hitModel, hitScore } from '~/tv/lib/hitClassifier';

export const HIT_MODEL = 'motion-ball-to-rim-evidence-v1';
export interface HitEvidence {
    /** Distances use aspect-correct source coordinates in image-height units. */
    approachDistance: number;
    rimDistance: number;
    /** Image-height units per second; observations count actual moving detections. */
    speed: number;
    observations: number;
    occluded: boolean;
    exitObserved: boolean;
}
export interface HitProposal {
    at: number;
    imageCup: { x: number; y: number; radius: number };
    evidence: HitEvidence;
    confidence: number;
}
type Point = BallCandidate & { at: number };
type Track = { points: Point[]; emitted: boolean; pending?: HitProposal };

/** Suggestions arise from motion approaching a fresh rim, independent of recorded score events.
 * A disappearance or observed exit is evidence for review, never proof the ball stayed in a cup. */
export class HitProposer {
    private tracks: Track[] = [];
    private cups: { at: number; cups: Cup[] } = { at: 0, cups: [] };
    private cooldown: { at: number; x: number; y: number }[] = [];
    private lastAt = 0;
    setCups(at: number, cups: Cup[]) {
        this.cups = { at, cups };
    }
    reset() {
        this.tracks = [];
        this.cups = { at: 0, cups: [] };
        this.cooldown = [];
        this.lastAt = 0;
    }
    observe(at: number, balls: BallCandidate[], obscured: boolean, aspect: number): HitProposal[] {
        if (at <= this.lastAt || at - this.lastAt > 350) this.tracks = [];
        this.lastAt = at;
        const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
            Math.hypot((a.x - b.x) * aspect, a.y - b.y);
        const proposals: HitProposal[] = [];
        this.cooldown = this.cooldown.filter((c) => at - c.at < 2500);
        const emit = (track: Track, exited: boolean) => {
            const p = track.pending;
            if (!p || track.emitted || at - p.at > 750) return;
            track.emitted = true;
            if (
                this.cooldown.some(
                    (c) => distance(c, p.imageCup) < Math.max(0.025, p.imageCup.radius * aspect * 2)
                )
            )
                return;
            if (this.cooldown.some((c) => at - c.at < 1200)) return;
            this.cooldown.push({ at, ...p.imageCup });
            const evidence = {
                ...p.evidence,
                occluded: p.evidence.occluded || obscured,
                exitObserved: exited,
            };
            const score = hitScore(evidence);
            if (score !== null && hitModel && score < hitModel.threshold) return;
            proposals.push({
                ...p,
                evidence,
                confidence: score ?? (exited ? 0.45 : evidence.occluded ? 0.5 : 0.65),
            });
        };
        for (const track of this.tracks) {
            if (obscured && track.pending) track.pending.evidence.occluded = true;
            if (at - track.points[track.points.length - 1].at >= 220) emit(track, false);
        }
        this.tracks = this.tracks.filter((t) => at - t.points[t.points.length - 1].at < 350);
        if (obscured) return proposals;
        const used = new Set<Track>();
        for (const ball of balls) {
            if (ball.source === 'static-color-appearance') continue;
            const options = this.tracks
                .filter((t) => !used.has(t) && t.points[t.points.length - 1].color === ball.color)
                .map((t) => ({ t, d: distance(t.points[t.points.length - 1], ball) }))
                .filter((o) => o.d < 0.15)
                .sort((a, b) => a.d - b.d);
            if (options.length > 1 && options[1].d - options[0].d < 0.015) continue;
            const track = options[0]?.t ?? { points: [], emitted: false };
            if (!options.length) this.tracks.push(track);
            used.add(track);
            track.points.push({ ...ball, at });
            track.points = track.points.slice(-8);
            if (track.emitted) continue;
            if (
                track.pending &&
                at - track.pending.at >= 67 &&
                distance(ball, track.pending.imageCup) > track.pending.imageCup.radius * aspect * 2
            ) {
                emit(track, true);
                continue;
            }
            if (
                track.pending ||
                track.points.length < 3 ||
                at - this.cups.at > 1500 ||
                this.cups.at > at
            )
                continue;
            const first = track.points[0],
                last = track.points[track.points.length - 1];
            const travel = distance(first, last),
                elapsed = (last.at - first.at) / 1000;
            if (travel < 0.025 || elapsed <= 0 || elapsed > 0.6 || travel / elapsed < 0.08)
                continue;
            const rims = this.cups.cups
                .flatMap((cup) => {
                    const rim = ballRim(cup);
                    return rim ? [{ rim, d: distance(ball, rim) }] : [];
                })
                .sort((a, b) => a.d - b.d);
            const nearest = rims[0];
            if (
                !nearest ||
                nearest.d > Math.max(0.012, nearest.rim.radius * aspect * 1.3) ||
                (rims[1] && rims[1].d - nearest.d < nearest.rim.radius * aspect * 0.35)
            )
                continue;
            const approach = distance(first, nearest.rim);
            if (approach < nearest.d + 0.025) continue;
            track.pending = {
                at,
                imageCup: nearest.rim,
                confidence: 0.65,
                evidence: {
                    approachDistance: approach,
                    rimDistance: nearest.d,
                    speed: travel / elapsed,
                    observations: track.points.length,
                    occluded: false,
                    exitObserved: false,
                },
            };
        }
        this.tracks = this.tracks.slice(-24);
        return proposals;
    }
}
