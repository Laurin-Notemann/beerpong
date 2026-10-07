import { cupVertices, type Cup, type PlayingArea } from '~/tv/lib/cupVision';

type Point = { x: number; y: number; bodyY: number; diameter: number; cup: Cup };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function point(cup: Cup, aspect: number): Point {
    const vertices = cupVertices(cup);
    const top = Math.min(...vertices.map((p) => p[1]));
    const height = Math.max(...vertices.map((p) => p[1])) - top;
    const rim = vertices.filter((p) => p[1] <= top + height * 0.25);
    const left = Math.min(...rim.map((p) => p[0])) * aspect;
    const right = Math.max(...rim.map((p) => p[0])) * aspect;
    return {
        x: (left + right) / 2,
        y: top,
        bodyY: top + height / 2,
        diameter: right - left,
        cup,
    };
}

/** Search beyond the rack boundary to capture whole cups, while keeping the two sides separate. */
export function cupSearchAreas(areas: PlayingArea[]): PlayingArea[] {
    return areas.map((area, side) => {
        const other = areas[1 - side];
        let left = Math.max(0, area.x - area.width * 0.4);
        let right = Math.min(1, area.x + area.width * 1.4);
        let top = Math.max(0, area.y - area.height * 0.4);
        let bottom = Math.min(1, area.y + area.height * 1.4);
        if (area.x + area.width <= other.x)
            right = Math.min(right, (area.x + area.width + other.x) / 2);
        else if (other.x + other.width <= area.x)
            left = Math.max(left, (other.x + other.width + area.x) / 2);
        else if (area.y + area.height <= other.y)
            bottom = Math.min(bottom, (area.y + area.height + other.y) / 2);
        else top = Math.max(top, (other.y + other.height + area.y) / 2);
        return { x: left, y: top, width: right - left, height: bottom - top };
    });
}

/** Cup segmentation finds objects; rack membership uses spatial neighbours and recent positions.
 * The match count is an upper bound, never a reason to invent a missing observation. Ambiguous
 * surplus cups cannot update trusted positions, display or the shared formation. */
export class CupMembership {
    private previous: { point: Point; seen: number }[][] = [[], []];
    private key = '';
    observe(
        cups: Cup[],
        areas: PlayingArea[],
        aspect: number,
        now: number,
        expected: [number, number] | null,
        key: string
    ) {
        if (this.key !== key) {
            this.previous = [[], []];
            this.key = key;
        }
        const points = cups.map((cup) => point(cup, aspect));
        const ambiguousSides: boolean[] = [];
        const sides = areas.map((area, side) => {
            const search = cupSearchAreas(areas)[side];
            const inside = (p: Point, box: PlayingArea) =>
                p.x >= box.x * aspect &&
                p.x <= (box.x + box.width) * aspect &&
                p.y >= box.y &&
                p.y <= box.y + box.height;
            const available = points.filter((p) => inside(p, search));
            const old = this.previous[side].filter((p) => now - p.seen < 2500);
            const widths = available
                .map((p) => p.diameter)
                .filter((w) => w > 0)
                .sort((a, b) => a - b);
            const spacing = widths[Math.floor(widths.length / 2)] ?? 0;
            const nearby = (a: Point, b: Point) => distance(a, b) <= spacing * 1.9;
            // A cup's rim can rise above the selected playing area while its body
            // is inside it. Every core cup is a seed, including loose reracks.
            const core = available.filter((p) => inside({ ...p, y: p.bodyY }, area));
            const centre = {
                x: (area.x + area.width / 2) * aspect,
                y: area.y + area.height / 2,
                bodyY: area.y + area.height / 2,
                diameter: 0,
                cup: cups[0],
            };
            const continuity = (p: Point) =>
                old.length ? Math.min(...old.map((o) => distance(p, o.point))) : Infinity;
            const candidates = available.filter(
                (p) =>
                    core.includes(p) ||
                    core.some((r) => nearby(r, p)) ||
                    continuity(p) < spacing * 1.8
            );
            const priority = (p: Point) =>
                (continuity(p) < spacing * 0.6 ? 4 : 0) +
                candidates.filter((other) => other !== p && nearby(p, other)).length -
                distance(p, centre) / Math.max(spacing, 1e-6);
            candidates.sort((a, b) => priority(b) - priority(a));
            const limit = expected ? expected[side] : 10;
            let resolved = candidates;
            if (expected && candidates.length > limit) {
                // A larger stored rack must not become an active rack simply by
                // trimming its densest cups to the match count. Compare whole
                // connected groups; partial or competing groups stay ambiguous.
                const pending = new Set(candidates);
                const components: Point[][] = [];
                while (pending.size) {
                    const seed = pending.values().next().value;
                    if (!seed) break;
                    pending.delete(seed);
                    const component = [seed];
                    for (let i = 0; i < component.length; i++) {
                        for (const p of pending) {
                            if (nearby(component[i], p)) {
                                pending.delete(p);
                                component.push(p);
                            }
                        }
                    }
                    components.push(component);
                }
                const compatible = components.filter((group) => group.length <= limit);
                if (compatible.length === 1 && compatible[0].length === limit)
                    resolved = compatible[0];
            }
            ambiguousSides[side] = resolved.length > limit;
            if (ambiguousSides[side]) return [];
            const fresh = resolved;
            this.previous[side] = fresh.map((p) => ({ point: p, seen: now }));
            return fresh.map((p) => p.cup);
        });
        const selected = sides.flat();
        return {
            cups: selected,
            sides,
            // An uncertain rack must not erase fresh evidence for the other team.
            fresh: sides.flatMap((cups, side) => (ambiguousSides[side] ? [] : cups)),
            ignored: cups.length - selected.length,
            ambiguous: ambiguousSides.some(Boolean),
        };
    }
}
