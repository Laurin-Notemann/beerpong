import document from '~/tv/lib/ballModel.json';

interface BallModel {
    id: string;
    threshold: number;
    supportedColors: string[];
    trees: number[][][];
    features?: string;
    featureCount?: number;
}

// The checked-in registry remains empty until a reviewed model passes offline promotion gates.
const registry = document as BallModel | null;
export const ballModel =
    registry &&
    (registry.features === undefined || registry.features === 'radial-rgb-color-v1'
        ? registry.featureCount === undefined || registry.featureCount === 18
        : registry.features === 'radial-rgb-local-v2' && registry.featureCount === 37)
        ? registry
        : null;

/** The same 8×8 sampling and radial features used by the offline candidate classifier. */
export function ballAppearance(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radius: number,
    version = 'radial-rgb-color-v1'
) {
    const padding = Math.max((12 * width) / 640, radius * 3);
    const left = Math.max(0, Math.round(centerX - padding));
    const top = Math.max(0, Math.round(centerY - padding));
    const right = Math.min(width, Math.round(centerX + padding));
    const bottom = Math.min(height, Math.round(centerY + padding));
    const sums = Array.from({ length: 3 }, () => Array(6).fill(0) as number[]);
    const counts = [0, 0, 0];
    for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
            const sx = left + ((x + 0.5) * (right - left)) / 8 - 0.5;
            const sy = top + ((y + 0.5) * (bottom - top)) / 8 - 0.5;
            const rgb = [0, 1, 2].map((channel) => {
                const x0 = Math.max(0, Math.min(width - 1, Math.floor(sx)));
                const y0 = Math.max(0, Math.min(height - 1, Math.floor(sy)));
                const x1 = Math.min(width - 1, x0 + 1),
                    y1 = Math.min(height - 1, y0 + 1);
                const dx = sx - Math.floor(sx),
                    dy = sy - Math.floor(sy);
                return (
                    ((pixels[(y0 * width + x0) * 4 + channel] * (1 - dx) +
                        pixels[(y0 * width + x1) * 4 + channel] * dx) *
                        (1 - dy) +
                        (pixels[(y1 * width + x0) * 4 + channel] * (1 - dx) +
                            pixels[(y1 * width + x1) * 4 + channel] * dx) *
                            dy) /
                    255
                );
            });
            const [r, g, b] = rgb;
            const d = Math.hypot(x - 3.5, y - 3.5),
                ring = d < 1.5 ? 0 : d < 3 ? 1 : 2;
            const values = [
                r,
                g,
                b,
                r > 0.45 && g > 0.2 && r > g * 1.13 && g > b * 1.3 && r - b > 0.17 ? 1 : 0,
                Math.min(r, g, b) > 0.6 && Math.max(r, g, b) - Math.min(r, g, b) < 0.18 ? 1 : 0,
                Math.max(r, g, b) - Math.min(r, g, b),
            ];
            values.forEach((v, i) => {
                sums[ring][i] += v;
            });
            counts[ring]++;
        }
    const legacy = sums.flatMap((sum, index) => sum.map((value) => value / counts[index]));
    if (version === 'radial-rgb-color-v1') return legacy;
    if (version !== 'radial-rgb-local-v2') throw new Error('Unsupported ball appearance features');
    // Tiny balls can fall between legacy grid samples. Sample the source center
    // and an adaptive disk directly, then compare it with its surroundings.
    const sample = (x: number, y: number) => {
        x = Math.max(0, Math.min(width - 1, x));
        y = Math.max(0, Math.min(height - 1, y));
        const x0 = Math.floor(x),
            y0 = Math.floor(y),
            x1 = Math.min(width - 1, x0 + 1),
            y1 = Math.min(height - 1, y0 + 1);
        const dx = x - x0,
            dy = y - y0;
        return [0, 1, 2].map(
            (c) =>
                ((pixels[(y0 * width + x0) * 4 + c] * (1 - dx) +
                    pixels[(y0 * width + x1) * 4 + c] * dx) *
                    (1 - dy) +
                    (pixels[(y1 * width + x0) * 4 + c] * (1 - dx) +
                        pixels[(y1 * width + x1) * 4 + c] * dx) *
                        dy) /
                255
        );
    };
    const saturation = (rgb: number[]) => Math.max(...rgb) - Math.min(...rgb);
    const orange = ([r, g, b]: number[]) =>
        r > 0.45 && g > 0.2 && r > g * 1.13 && g > b * 1.3 && r - b > 0.17;
    const white = (rgb: number[]) => Math.min(...rgb) > 0.6 && saturation(rgb) < 0.18;
    const center = sample(centerX, centerY),
        scale = width / 640;
    const innerRadius = Math.max(2 * scale, Math.min(6 * scale, radius * 0.75));
    const outerRadius = Math.max(5 * scale, Math.min(14 * scale, radius * 2));
    const inner: number[][] = [],
        positions: number[][] = [];
    for (let y = -3; y <= 3; y++)
        for (let x = -3; x <= 3; x++) {
            if (Math.hypot(x, y) > 2.5) continue;
            const rgb = sample(
                centerX + (x * innerRadius) / 2.5,
                centerY + (y * innerRadius) / 2.5
            );
            inner.push(rgb);
            if (orange(rgb)) positions.push([x, y]);
        }
    const outer = Array.from({ length: 16 }, (_, i) =>
        sample(
            centerX + Math.cos((i * Math.PI) / 8) * outerRadius,
            centerY + Math.sin((i * Math.PI) / 8) * outerRadius
        )
    );
    const mean = (values: number[][]) =>
        [0, 1, 2].map((c) => values.reduce((sum, rgb) => sum + rgb[c], 0) / values.length);
    const inside = mean(inner),
        outside = mean(outer);
    const xs = positions.map((p) => p[0]),
        ys = positions.map((p) => p[1]);
    const boxWidth = positions.length ? Math.max(...xs) - Math.min(...xs) + 1 : 0,
        boxHeight = positions.length ? Math.max(...ys) - Math.min(...ys) + 1 : 0;
    const gradient =
        inner.reduce(
            (sum, rgb) =>
                sum + Math.abs((rgb[0] + rgb[1] + rgb[2] - center[0] - center[1] - center[2]) / 3),
            0
        ) / inner.length;
    return [
        ...legacy,
        ...center,
        saturation(center),
        ...inside,
        inner.filter(orange).length / inner.length,
        inner.filter(white).length / inner.length,
        inner.reduce((sum, rgb) => sum + saturation(rgb), 0) / inner.length,
        ...outside,
        ...inside.map((v, i) => (v - outside[i] + 1) / 2),
        positions.length ? positions.length / (boxWidth * boxHeight) : 0,
        positions.length ? Math.min(boxWidth, boxHeight) / Math.max(boxWidth, boxHeight) : 0,
        gradient,
    ];
}

export function appearanceScore(features: number[], model: BallModel) {
    let score = 0;
    for (const tree of model.trees) {
        let index = 0;
        // Exported trees have depth <=7. The bound also contains a malformed future model.
        for (let depth = 0; depth < 8; depth++) {
            const node = tree[index];
            if (!node) return 0;
            if (node[0] < 0) {
                score += node[4];
                break;
            }
            index = features[node[0]] <= node[1] ? node[2] : node[3];
        }
    }
    return model.trees.length ? score / model.trees.length : 0;
}
