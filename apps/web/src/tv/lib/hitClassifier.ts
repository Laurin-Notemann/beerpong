import artifact from '~/tv/lib/hitModel.json';
import type { HitEvidence } from '~/tv/lib/hitProposals';

const names = [
    'approachDistance',
    'rimDistance',
    'speed',
    'observations',
    'occluded',
    'exitObserved',
] as const;
const scales = [0.1, 0.05, 1, 10, 1, 1];
export interface HitModel {
    id: string;
    version: 1;
    features: 'ball-to-rim-evidence-v1';
    featureNames: string[];
    scales: number[];
    clip: [number, number];
    weights: number[];
    threshold: number;
}
function model(value: unknown): HitModel | null {
    const v = value as HitModel | null;
    return v &&
        v.version === 1 &&
        typeof v.id === 'string' &&
        v.id.length > 0 &&
        v.id.length <= 100 &&
        v.features === 'ball-to-rim-evidence-v1' &&
        JSON.stringify(v.featureNames) === JSON.stringify(names) &&
        JSON.stringify(v.scales) === JSON.stringify(scales) &&
        JSON.stringify(v.clip) === '[-10,10]' &&
        Array.isArray(v.weights) &&
        v.weights.length === 7 &&
        v.weights.every(Number.isFinite) &&
        Number.isFinite(v.threshold) &&
        v.threshold >= 0 &&
        v.threshold <= 1
        ? v
        : null;
}
// A reviewed, qualified event classifier may be installed explicitly. Null keeps assisted motion evidence.
export const hitModel = model(artifact);
if (artifact !== null && !hitModel && typeof window !== 'undefined') {
    void import('~/tv/sentry').then(async ({ initTvSentry }) => {
        initTvSentry();
        const Sentry = await import('@sentry/browser');
        Sentry.captureMessage('Invalid hit classifier artifact; motion assistance retained', {
            level: 'error',
            tags: { operation: 'hit-classifier-load' },
            extra: { expectedFeatures: 'ball-to-rim-evidence-v1' },
        });
    });
}
export function hitScore(evidence: HitEvidence) {
    if (!hitModel) return null;
    const values = names.map((key, i) =>
        Math.max(-10, Math.min(10, Number(evidence[key]) / scales[i]))
    );
    const logit = values.reduce(
        (sum, value, i) => sum + value * hitModel.weights[i],
        hitModel.weights[6]
    );
    return 1 / (1 + Math.exp(-Math.max(-60, Math.min(60, logit))));
}
