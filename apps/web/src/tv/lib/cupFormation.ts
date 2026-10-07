import { Formation } from '@/components/CupGrid/Formation';
import { cupVertices, type Cup, type PlayingArea } from '~/tv/lib/cupVision';

export interface GridCup {
    x: number;
    y: number;
}
export interface FormationMatch {
    id: string;
    seq: number;
    templates?: GridCup[][];
    blue: { cup: GridCup; drawn: GridCup }[];
    red: { cup: GridCup; drawn: GridCup }[];
}

export const gridKey = (cups: GridCup[]) =>
    [...cups]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((c) => `${c.x}:${c.y}`)
        .join(',');
export function validGrid(value: unknown): value is GridCup[] {
    const cups = value as GridCup[];
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 10 &&
        cups.every(
            (c) =>
                c &&
                Number.isInteger(c.x) &&
                Number.isInteger(c.y) &&
                c.x >= 0 &&
                c.x <= 6 &&
                c.y >= 0 &&
                c.y <= 6
        ) &&
        new Set(cups.map((c) => `${c.x}:${c.y}`)).size === value.length
    );
}

type Point = { x: number; y: number };
type Transform = { origin: Point; across: Point; depth: Point };
type Fit = { grid: GridCup[]; error: number; transform: Transform; template: GridCup[] };
const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

/** Rim centres stay put when an overlapping cup hides part of another cup's body. */
export function cupPoints(cups: Cup[], area: PlayingArea, aspect: number): Point[] {
    const left = Math.max(0, area.x - area.width * 0.4);
    const right = Math.min(1, area.x + area.width * 1.4);
    const upper = Math.max(0, area.y - area.height * 0.4);
    const lower = Math.min(1, area.y + area.height * 1.4);
    return cups.flatMap((cup) => {
        const vertices = cupVertices(cup);
        const top = Math.min(...vertices.map((p) => p[1]));
        const bottom = Math.max(...vertices.map((p) => p[1]));
        const rim = vertices.filter((p) => p[1] <= top + (bottom - top) * 0.25);
        const x = (Math.min(...rim.map((p) => p[0])) + Math.max(...rim.map((p) => p[0]))) / 2;
        return x >= left && x <= right && top >= upper && top <= lower
            ? [{ x: x * aspect, y: top }]
            : [];
    });
}

function project(points: Point[], template: GridCup[], transform: Transform): Fit | null {
    const { origin, across, depth } = transform;
    const determinant = cross(across, depth);
    if (Math.abs(determinant) < 1e-8) return null;
    const grid: GridCup[] = [];
    let error = 0;
    for (const point of points) {
        const relative = subtract(point, origin);
        const x = cross(relative, depth) / determinant;
        const y = cross(across, relative) / determinant;
        let distance = Infinity;
        let closest = template[0];
        for (const slot of template) {
            const d = (x - slot.x) ** 2 + (y - slot.y) ** 2;
            if (d < distance) {
                distance = d;
                closest = slot;
            }
        }
        // Less than a third of normal cup spacing. Never merge detections or invent cups.
        if (
            distance > 0.6 ** 2 ||
            grid.some((slot) => slot.x === closest.x && slot.y === closest.y)
        )
            return null;
        grid.push(closest);
        error += distance;
    }
    error /= points.length;
    return error <= 0.12 ? { grid, error, transform, template } : null;
}

/** Fit the app's existing templates, removing camera rotation, scale and affine skew.
 * Store occupied grid slots, never rounded image coordinates. The first fit is bounded by
 * ten cups; subsequent frames reuse its calibration so the rack cannot drift with jitter. */
export class FormationFitter {
    private fitted: Fit | null = null;
    /** Identity requires a measured plane, never the small-rack fallback. Return drawn slot only
     * when its projection is unique; the caller maps it back to the original standing cup. */
    identify(point: Point, current: GridCup[]): GridCup | null {
        if (!this.fitted) return null;
        const { origin, across, depth } = this.fitted.transform;
        const determinant = cross(across, depth);
        if (Math.abs(determinant) < 1e-8) return null;
        const relative = subtract(point, origin);
        const x = cross(relative, depth) / determinant;
        const y = cross(across, relative) / determinant;
        const slots = current
            .map((slot) => ({ slot, d: Math.hypot(x - slot.x, y - slot.y) }))
            .sort((a, b) => a.d - b.d);
        if (!slots.length || slots[0].d > 0.45 || (slots[1] && slots[1].d - slots[0].d < 0.25))
            return null;
        return slots[0].slot;
    }
    observe(
        cups: Cup[],
        area: PlayingArea,
        aspect: number,
        current: GridCup[],
        templates: GridCup[][] = [],
        towards: Point = { x: 1, y: 0 }
    ): GridCup[] | null {
        const points = cupPoints(cups, area, aspect);
        if (!points.length || points.length > 10 || points.length !== current.length) return null;
        if (this.fitted) {
            const continued = project(points, this.fitted.template, this.fitted.transform);
            if (continued) return continued.grid;
        }
        // A few/collinear cups cannot establish a new table plane. Keep the known formation.
        if (points.length < 4) return validGrid(current) ? current : null;
        const acrossDirection = { x: -towards.y, y: towards.x };
        if (acrossDirection.y < 0) {
            acrossDirection.x *= -1;
            acrossDirection.y *= -1;
        }
        const available = [Formation.Pyramid_10.cups, current, ...templates.slice(0, 16)]
            .filter((grid) => validGrid(grid) && grid.length >= points.length)
            .filter(
                (grid, index, all) => all.findIndex((g) => gridKey(g) === gridKey(grid)) === index
            );
        // A larger template already tests every occupied subset of its slots.
        const candidates = available.filter(
            (grid) =>
                !available.some(
                    (other) =>
                        other.length > grid.length &&
                        grid.every((slot) => other.some((p) => p.x === slot.x && p.y === slot.y))
                )
        );
        const fits = new Map<string, Fit>();
        for (const template of candidates) {
            for (let a = 0; a < template.length - 2; a++) {
                for (let b = a + 1; b < template.length - 1; b++) {
                    for (let c = b + 1; c < template.length; c++) {
                        const u = subtract(template[b], template[a]),
                            v = subtract(template[c], template[a]);
                        const determinant = cross(u, v);
                        if (Math.abs(determinant) < 1) continue;
                        for (let i = 0; i < points.length; i++) {
                            for (let j = 0; j < points.length; j++) {
                                if (i === j) continue;
                                for (let k = 0; k < points.length; k++) {
                                    if (k === i || k === j) continue;
                                    const p = subtract(points[j], points[i]),
                                        q = subtract(points[k], points[i]);
                                    const across = {
                                        x: (p.x * v.y - q.x * u.y) / determinant,
                                        y: (p.y * v.y - q.y * u.y) / determinant,
                                    };
                                    const depth = {
                                        x: (q.x * u.x - p.x * v.x) / determinant,
                                        y: (q.y * u.x - p.y * v.x) / determinant,
                                    };
                                    const width = Math.hypot(across.x, across.y),
                                        length = Math.hypot(depth.x, depth.y);
                                    // Cup rows run across the table; depth points toward the other playing area.
                                    if (
                                        width / length < 0.4 ||
                                        width / length > 2.5 ||
                                        dot(across, acrossDirection) <
                                            width *
                                                Math.hypot(acrossDirection.x, acrossDirection.y) *
                                                0.65 ||
                                        dot(depth, towards) <
                                            length * Math.hypot(towards.x, towards.y) * 0.65 ||
                                        Math.abs(cross(across, depth)) < width * length * 0.5
                                    )
                                        continue;
                                    const origin = {
                                        x:
                                            points[i].x -
                                            across.x * template[a].x -
                                            depth.x * template[a].y,
                                        y:
                                            points[i].y -
                                            across.y * template[a].x -
                                            depth.y * template[a].y,
                                    };
                                    const fit = project(points, template, {
                                        origin,
                                        across,
                                        depth,
                                    });
                                    if (!fit) continue;
                                    const key = gridKey(fit.grid),
                                        previous = fits.get(key);
                                    if (!previous || fit.error < previous.error) fits.set(key, fit);
                                }
                            }
                        }
                    }
                }
            }
        }
        const ranked = [...fits.values()].sort((a, b) => a.error - b.error);
        if (!ranked.length) return null;
        // Prefer a geometrically consistent saved formation. With equally plausible new
        // occupancies, hold the match instead of guessing which original cup moved.
        const known = fits.get(gridKey(current));
        const best = known && known.error <= ranked[0].error + 0.025 ? known : ranked[0];
        const alternative = ranked.find((fit) => gridKey(fit.grid) !== gridKey(best.grid));
        if (best !== known && alternative && alternative.error - best.error < 0.025) return null;
        this.fitted = best;
        return best.grid;
    }
}

/** Require repeated identical grid positions, then bound writes even under noisy detections. */
export class StableFormation {
    private key = '';
    private since = 0;
    private samples = 0;
    private lastWrite = -Infinity;
    observe(cups: GridCup[] | null, now: number) {
        const key = cups ? gridKey(cups) : '';
        if (!key || key !== this.key) {
            this.key = key;
            this.since = now;
            this.samples = key ? 1 : 0;
            return null;
        }
        this.samples++;
        if (this.samples < 4 || now - this.since < 5000 || now - this.lastWrite < 15000)
            return null;
        this.lastWrite = now;
        return cups;
    }
}

/** Preserve original cup identities as positions move, so taps and undo still refer to them. */
export function pairFormation(slots: { cup: GridCup; drawn: GridCup }[], drawn: GridCup[]) {
    const available = [...slots];
    return drawn.map((at) => {
        let idx = 0;
        available.forEach((slot, i) => {
            const distance = (p: GridCup) => (p.x - at.x) ** 2 + (p.y - at.y) ** 2;
            if (distance(slot.drawn) < distance(available[idx].drawn)) idx = i;
        });
        return available.splice(idx, 1)[0].cup;
    });
}
