/** Only geometry crosses the peer connection; images and inference stay on the camera. */
export interface Cup {
    score: number;
    outline: [number, number][];
    /** Additional visible pieces of the same cup, separated by a hand or another occluder. */
    parts?: [number, number][][];
}

export const cupOutlines = (cup: Cup) => [cup.outline, ...(cup.parts ?? [])];
export const cupVertices = (cup: Cup) => cupOutlines(cup).flat();

export interface CupFrame {
    version: 1;
    model: string;
    sequence: number;
    ageMs: number;
    cups: Cup[];
}

export const CUP_CHANNEL = 'versus-cups-v1';
export const MAX_CUPS = 32;
export const MAX_POINTS = 64;
export const MAX_PARTS = 3;
export const MAX_AGE_MS = 3000;

/** Untrusted peer data is bounded before it can reach a canvas or telemetry. */
export function parseCupFrame(raw: unknown): CupFrame | null {
    if (typeof raw !== 'string' || raw.length > 80_000) return null;
    try {
        const value = JSON.parse(raw) as CupFrame;
        if (
            value.version !== 1 ||
            typeof value.model !== 'string' ||
            value.model.length > 100 ||
            !Number.isSafeInteger(value.sequence) ||
            value.sequence < 0 ||
            !Number.isFinite(value.ageMs) ||
            value.ageMs < 0 ||
            value.ageMs > MAX_AGE_MS ||
            !Array.isArray(value.cups) ||
            value.cups.length > MAX_CUPS
        )
            return null;
        const validOutline = (outline: Cup['outline']) =>
            Array.isArray(outline) &&
            outline.length >= 3 &&
            outline.length <= MAX_POINTS &&
            outline.every(
                (point) =>
                    Array.isArray(point) &&
                    point.length === 2 &&
                    point.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
            );
        for (const cup of value.cups) {
            if (
                !Number.isFinite(cup.score) ||
                cup.score < 0 ||
                cup.score > 1 ||
                !validOutline(cup.outline) ||
                (cup.parts !== undefined &&
                    (!Array.isArray(cup.parts) ||
                        cup.parts.length >= MAX_PARTS ||
                        !cup.parts.every(validOutline) ||
                        cupVertices(cup).length > MAX_POINTS))
            )
                return null;
        }
        return value;
    } catch {
        return null;
    }
}

const frames = new WeakMap<MediaStream, { value: CupFrame; received: number }>();

export function receiveCups(stream: MediaStream, value: CupFrame, now = performance.now()) {
    const previous = frames.get(stream);
    if (previous && previous.value.sequence >= value.sequence) return false;
    frames.set(stream, { value, received: now });
    return true;
}

export function drawCups(
    context: CanvasRenderingContext2D,
    stream: MediaStream,
    now = performance.now(),
    size: { width: number; height: number } = context.canvas
) {
    const frame = frames.get(stream);
    if (!frame || now - frame.received + frame.value.ageMs > MAX_AGE_MS) return;
    const { width, height } = size;
    context.save();
    context.strokeStyle = 'rgba(110,255,218,0.95)';
    context.lineWidth = Math.max(1, width / 720);
    context.lineJoin = 'round';
    for (const cup of frame.value.cups) {
        for (const points of cupOutlines(cup)) {
            context.beginPath();
            const last = points[points.length - 1],
                first = points[0];
            context.moveTo(((last[0] + first[0]) * width) / 2, ((last[1] + first[1]) * height) / 2);
            points.forEach(([x, y], i) => {
                const next = points[(i + 1) % points.length];
                context.quadraticCurveTo(
                    x * width,
                    y * height,
                    ((x + next[0]) * width) / 2,
                    ((y + next[1]) * height) / 2
                );
            });
            context.closePath();
            context.stroke();
        }
    }
    context.restore();
}

/** Exterior components of one instance mask, in source-image coordinates. */
function maskBoundaries(mask: ArrayLike<number>, width: number, height: number) {
    const edges = new Map<number, number[]>();
    const stride = width + 1;
    const add = (a: number, b: number) => edges.set(a, [...(edges.get(a) ?? []), b]);
    const on = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] > 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!on(x, y)) continue;
            const a = y * stride + x;
            if (!on(x, y - 1)) add(a, a + 1);
            if (!on(x + 1, y)) add(a + 1, a + stride + 1);
            if (!on(x, y + 1)) add(a + stride + 1, a + stride);
            if (!on(x - 1, y)) add(a + stride, a);
        }
    }
    const boundaries: { loop: [number, number][]; area: number }[] = [];
    while (edges.size) {
        const start = edges.keys().next().value!;
        let at = start;
        const loop: [number, number][] = [];
        do {
            loop.push([(at % stride) / width, Math.floor(at / stride) / height]);
            const next = edges.get(at);
            if (!next?.length) break;
            const to = next.pop()!;
            if (!next.length) edges.delete(at);
            at = to;
        } while (at !== start && loop.length <= (width + 1) * (height + 1) * 4);
        const area = loop.reduce((sum, [x, y], i) => {
            const next = loop[(i + 1) % loop.length];
            return sum + x * next[1] - next[0] * y;
        }, 0);
        // Inner holes have the opposite winding; they are not disconnected cup pieces.
        if (area > 0) boundaries.push({ loop, area });
    }
    return boundaries.sort((a, b) => b.area - a.area);
}

function boundedOutline(loop: Cup['outline'], budget: number): Cup['outline'] {
    // Downsample the closed perimeter to a bounded, small peer message.
    const step = Math.max(1, Math.ceil(loop.length / budget));
    return loop
        .filter((_, i) => i % step === 0)
        .map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
}

/** Legacy single-boundary callers retain the dominant visible silhouette. */
export function maskOutline(mask: ArrayLike<number>, width: number, height: number) {
    return boundedOutline(maskBoundaries(mask, width, height)[0]?.loop ?? [], MAX_POINTS);
}

/** One instance can have separated visible pieces; never bridge through an occluding hand. */
export function maskOutlines(mask: ArrayLike<number>, width: number, height: number) {
    const boundaries = maskBoundaries(mask, width, height);
    const largest = boundaries[0]?.area ?? 0;
    const kept = boundaries
        .filter((b, i) => i === 0 || b.area >= Math.max(4 / (width * height), largest * 0.01))
        .slice(0, MAX_PARTS);
    const perimeter = kept.reduce((n, b) => n + b.loop.length, 0);
    const spare = MAX_POINTS - kept.length * 3;
    return kept.map((b) =>
        boundedOutline(b.loop, 3 + Math.floor((spare * b.loop.length) / Math.max(perimeter, 1)))
    );
}

export interface CupModel {
    version: 1;
    id: string;
    url: string;
    sha256: string;
    size: number;
    cupClass: number;
    threshold: number;
    inputSize: number;
    source: 'coco-baseline' | 'reviewed-finetune';
}

/** Bilinear half-pixel resize, without antialiasing, matches RF-DETR's training input. */
export function cupInput(rgba: Uint8ClampedArray, width: number, height: number, size: number) {
    const output = new Float32Array(3 * size * size);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    for (let y = 0; y < size; y++) {
        const sy = Math.max(0, ((y + 0.5) * height) / size - 0.5);
        const y0 = Math.floor(sy),
            y1 = Math.min(height - 1, y0 + 1),
            fy = sy - y0;
        for (let x = 0; x < size; x++) {
            const sx = Math.max(0, ((x + 0.5) * width) / size - 0.5);
            const x0 = Math.floor(sx),
                x1 = Math.min(width - 1, x0 + 1),
                fx = sx - x0;
            for (let c = 0; c < 3; c++) {
                const top =
                    rgba[(y0 * width + x0) * 4 + c] * (1 - fx) +
                    rgba[(y0 * width + x1) * 4 + c] * fx;
                const bottom =
                    rgba[(y1 * width + x0) * 4 + c] * (1 - fx) +
                    rgba[(y1 * width + x1) * 4 + c] * fx;
                output[c * size * size + y * size + x] =
                    ((top * (1 - fy) + bottom * fy) / 255 - mean[c]) / std[c];
            }
        }
    }
    return output;
}

export interface PlayingArea {
    x: number;
    y: number;
    width: number;
    height: number;
}
export function validAreas(value: unknown): value is [PlayingArea, PlayingArea] {
    if (!Array.isArray(value) || value.length !== 2) return false;
    const areas = value as PlayingArea[];
    return (
        value.every(
            (a: PlayingArea) =>
                a &&
                [a.x, a.y, a.width, a.height].every(Number.isFinite) &&
                a.x >= 0 &&
                a.y >= 0 &&
                a.width >= 0.02 &&
                a.height >= 0.02 &&
                a.x + a.width <= 1.000001 &&
                a.y + a.height <= 1.000001
        ) &&
        (areas[0].x + areas[0].width <= areas[1].x ||
            areas[1].x + areas[1].width <= areas[0].x ||
            areas[0].y + areas[0].height <= areas[1].y ||
            areas[1].y + areas[1].height <= areas[0].y)
    );
}
/** Each formation occupies half the input, so small cups retain useful image detail. */
export function formationInput(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    size: number,
    areas: PlayingArea[]
) {
    const montage = new Uint8ClampedArray(size * size * 4);
    areas.forEach((a, side) => {
        const left = Math.round(a.x * width),
            top = Math.round(a.y * height);
        const w = Math.max(1, Math.round((a.x + a.width) * width) - left);
        const h = Math.max(1, Math.round((a.y + a.height) * height) - top);
        // Half-pixel bilinear sampling matches the offline montage used for training.
        for (let y = 0; y < size; y++)
            for (let x = 0; x < size / 2; x++) {
                const sx = Math.max(0, ((x + 0.5) * w) / (size / 2) - 0.5);
                const sy = Math.max(0, ((y + 0.5) * h) / size - 0.5);
                const x0 = Math.floor(sx),
                    x1 = Math.min(w - 1, x0 + 1),
                    fx = sx - x0;
                const y0 = Math.floor(sy),
                    y1 = Math.min(h - 1, y0 + 1),
                    fy = sy - y0;
                const at = (y * size + (side * size) / 2 + x) * 4;
                for (let c = 0; c < 3; c++) {
                    const pixel = (cx: number, cy: number) =>
                        rgba[((top + cy) * width + left + cx) * 4 + c];
                    montage[at + c] =
                        (pixel(x0, y0) * (1 - fx) + pixel(x1, y0) * fx) * (1 - fy) +
                        (pixel(x0, y1) * (1 - fx) + pixel(x1, y1) * fx) * fy;
                }
                montage[at + 3] = 255;
            }
    });
    return cupInput(montage, size, size, size);
}
export function formationCup(cup: Cup, areas: PlayingArea[]): Cup | null {
    const side = cup.outline.every(([x]) => x <= 0.5)
        ? 0
        : cup.outline.every(([x]) => x >= 0.5)
          ? 1
          : -1;
    if (side < 0) return null;
    const a = areas[side];
    // The stitched input joins two distant source areas. A stray component in the
    // other half cannot belong to this cup; retain its dominant valid observation.
    const parts = cup.parts?.filter((part) =>
        part.every(([x]) => (side === 0 ? x <= 0.5 : x >= 0.5))
    );
    const map = (outline: Cup['outline']): Cup['outline'] =>
        outline.map(([x, y]) => [a.x + (x * 2 - side) * a.width, a.y + y * a.height]);
    return {
        score: cup.score,
        outline: map(cup.outline),
        ...(parts?.length ? { parts: parts.map(map) } : {}),
    };
}
