import type { Cup, PlayingArea } from '~/tv/lib/cupVision';

export interface GridCup {
    x: number;
    y: number;
}
export interface FormationMatch {
    id: string;
    seq: number;
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

/** Cup bases locate the table contact, rather than the height-dependent silhouette centre.
 * Keep the camera's projected shape on the existing integer grid; this isn't a calibrated
 * measurement of physical distances. Ambiguous/overlapping projections are withheld. */
export function detectedFormation(
    cups: Cup[],
    area: PlayingArea,
    team: 'blue' | 'red',
    aspect: number
): GridCup[] | null {
    const points = cups.flatMap((c) => {
        const x0 = Math.min(...c.outline.map((p) => p[0])),
            x1 = Math.max(...c.outline.map((p) => p[0]));
        const y = Math.max(...c.outline.map((p) => p[1])),
            x = (x0 + x1) / 2;
        return x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height
            ? [{ x: x * aspect, y }]
            : [];
    });
    if (!points.length || points.length > 10) return null;
    if (points.length === 1) return [{ x: 3, y: 3 }];
    const minX = Math.min(...points.map((p) => p.x)),
        maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y)),
        maxY = Math.max(...points.map((p) => p.y));
    const scale = 6 / Math.max(maxX - minX, maxY - minY);
    if (!Number.isFinite(scale)) return null;
    const result = points.map((p) => ({
        x: Math.round(3 + (p.y - (minY + maxY) / 2) * scale),
        y: Math.round(3 + (team === 'blue' ? 1 : -1) * (p.x - (minX + maxX) / 2) * scale),
    }));
    if (!validGrid(result)) return null;
    return result.sort((a, b) => a.y - b.y || a.x - b.x);
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
