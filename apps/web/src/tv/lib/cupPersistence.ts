import { cupVertices, MAX_CUPS, type Cup } from '~/tv/lib/cupVision';

type Box = { x: number; y: number; width: number; height: number };
function bounds(cup: Cup): Box {
    const vertices = cupVertices(cup);
    const x = Math.min(...vertices.map((p) => p[0]));
    const y = Math.min(...vertices.map((p) => p[1]));
    return {
        x,
        y,
        width: Math.max(...vertices.map((p) => p[0])) - x,
        height: Math.max(...vertices.map((p) => p[1])) - y,
    };
}
const overlap = (a: Box, b: Box) => {
    const area =
        Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    return area / Math.max(a.width * a.height + b.width * b.height - area, 1e-9);
};
/** Hold one briefly missed observation for display only. Never use remembered cups as
 * fresh evidence for formation changes or hit detection. A new calibration resets this. */
export class CupPersistence {
    private previous: { cup: Cup; box: Box; seen: number }[] = [];
    observe(cups: Cup[], now: number) {
        const remaining = this.previous.filter((p) => now - p.seen <= 1000);
        const fresh = cups.map((cup) => {
            const box = bounds(cup);
            let best = -1,
                score = 0.25;
            remaining.forEach((old, i) => {
                const value = overlap(box, old.box);
                if (value > score) {
                    best = i;
                    score = value;
                }
            });
            if (best >= 0) remaining.splice(best, 1);
            return { cup, box, seen: now };
        });
        // Overlapping partial masks must not retain a second outline of the same cup.
        const held = remaining.filter((p) => !fresh.some((n) => overlap(p.box, n.box) > 0.15));
        this.previous = [...fresh, ...held].slice(0, MAX_CUPS);
        return {
            cups: this.previous.map((p) => p.cup),
            held: Math.min(held.length, MAX_CUPS - fresh.length),
        };
    }
}
