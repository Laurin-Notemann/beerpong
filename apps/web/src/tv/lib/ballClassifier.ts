import document from '~/tv/lib/ballModel.json';

interface BallModel {
    id: string;
    threshold: number;
    supportedColors: string[];
    trees: number[][][];
}

// The checked-in registry remains empty until a reviewed model passes offline promotion gates.
export const ballModel = document as BallModel | null;

/** The same 8×8 sampling and radial features used by the offline candidate classifier. */
export function ballAppearance(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radius: number
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
    return sums.flatMap((sum, index) => sum.map((value) => value / counts[index]));
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
