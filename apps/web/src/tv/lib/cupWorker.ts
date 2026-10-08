import * as ort from 'onnxruntime-web/wasm';

import {
    formationInput,
    formationCup,
    validAreas,
    maskOutlines,
    MAX_CUPS,
    type Cup,
    type CupModel,
    type PlayingArea,
} from '~/tv/lib/cupVision';

export type CupRequest =
    | { type: 'load'; base: string }
    | {
          type: 'frame';
          pixels: Uint8ClampedArray;
          width: number;
          height: number;
          areas: PlayingArea[];
      };
export type CupResult =
    | { type: 'progress'; message: string }
    | {
          type: 'ready';
          model: CupModel;
          loadMs: number;
          crossOriginIsolated?: boolean;
          numThreads?: number;
      }
    | {
          type: 'result';
          cups: Cup[];
          inferenceMs: number;
          preprocessMs?: number;
          modelRunMs?: number;
          postprocessMs?: number;
      }
    | { type: 'error'; message: string };

const worker = self as unknown as {
    onmessage: (event: MessageEvent<CupRequest>) => void;
    postMessage: (message: CupResult) => void;
};
let session: ort.InferenceSession | undefined;
let model: CupModel | undefined;
let busy = false;

async function process({ data }: MessageEvent<CupRequest>) {
    if (busy) return;
    busy = true;
    try {
        if (data.type === 'load') {
            const start = performance.now();
            const response = await fetch(`${data.base}model.json`);
            if (!response.ok) throw new Error(`Model manifest HTTP ${response.status}`);
            model = (await response.json()) as CupModel;
            if (
                model.version !== 1 ||
                model.inputSize !== 312 ||
                !Number.isInteger(model.cupClass) ||
                !/^[a-f0-9]{64}$/.test(model.sha256)
            )
                throw new Error('Unsupported cup model');
            ort.env.wasm.numThreads = self.crossOriginIsolated
                ? Math.min(2, navigator.hardwareConcurrency || 1)
                : 1;
            ort.env.wasm.wasmPaths = `${data.base}runtime/1.24.3/`;
            const url = new URL(model.url, data.base);
            if (
                url.origin !== new URL(data.base).origin ||
                !Number.isFinite(model.threshold) ||
                model.threshold < 0 ||
                model.threshold > 1 ||
                model.size < 1 ||
                model.size > 250_000_000 ||
                model.cupClass < 0
            )
                throw new Error('Invalid cup model manifest');
            const weights = await fetch(url);
            if (!weights.ok) throw new Error(`Model weights HTTP ${weights.status}`);
            worker.postMessage({ type: 'progress', message: 'Downloading cup model…' });
            const bytes = await weights.arrayBuffer();
            worker.postMessage({ type: 'progress', message: 'Checking cup model…' });
            const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
                .map((n) => n.toString(16).padStart(2, '0'))
                .join('');
            if (hash !== model.sha256 || bytes.byteLength !== model.size)
                throw new Error('Cup model checksum mismatch');
            worker.postMessage({ type: 'progress', message: 'Starting cup recognition…' });
            session = await ort.InferenceSession.create(bytes, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all',
            });
            worker.postMessage({
                type: 'ready',
                model,
                loadMs: performance.now() - start,
                crossOriginIsolated: self.crossOriginIsolated === true,
                numThreads: ort.env.wasm.numThreads,
            });
        } else if (session && model) {
            const start = performance.now();
            if (!validAreas(data.areas)) throw new Error('Select two separate playing areas');
            const input = formationInput(
                data.pixels,
                data.width,
                data.height,
                model.inputSize,
                data.areas
            );
            const inputTensor = new ort.Tensor('float32', input, [
                1,
                3,
                model.inputSize,
                model.inputSize,
            ]);
            const preparedAt = performance.now();
            const outputs = await session.run({ [session.inputNames[0]]: inputTensor });
            const inferredAt = performance.now();
            const logits = outputs.labels;
            const masks = outputs.masks;
            if (
                !logits ||
                !masks ||
                logits.dims.length !== 3 ||
                masks.dims.length !== 4 ||
                model.cupClass >= logits.dims[2]
            )
                throw new Error('Cup model output contract mismatch');
            const classes = logits.dims[2],
                queries = logits.dims[1];
            const height = masks.dims[2],
                width = masks.dims[3];
            const scores = logits.data as Float32Array;
            const maskData = masks.data as Float32Array;
            const candidates = Array.from({ length: queries }, (_, query) => ({
                query,
                score: 1 / (1 + Math.exp(-scores[query * classes + model!.cupClass])),
            }))
                .filter(({ score }) => score >= model!.threshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_CUPS);
            const kept: typeof candidates = [];
            for (const candidate of candidates) {
                const duplicate = kept.some((other) => {
                    let intersection = 0,
                        union = 0;
                    for (let i = 0; i < width * height; i++) {
                        const a = maskData[candidate.query * width * height + i] > 0;
                        const b = maskData[other.query * width * height + i] > 0;
                        if (a && b) intersection++;
                        if (a || b) union++;
                    }
                    // Duplicate instance masks must not inflate the rack count
                    // and suppress every real cup when membership is checked.
                    return union > 0 && intersection / union > 0.6;
                });
                if (!duplicate) kept.push(candidate);
            }
            const proposals = kept
                .map(({ query, score }) => {
                    const [outline = [], ...parts] = maskOutlines(
                        maskData.subarray(query * width * height, (query + 1) * width * height),
                        width,
                        height
                    );
                    return { score, outline, ...(parts.length ? { parts } : {}) };
                })
                .filter((cup) => cup.outline.length >= 3);
            const cups = proposals
                .map((cup) => formationCup(cup, data.areas))
                .filter((cup): cup is Cup => cup !== null);
            inputTensor.dispose();
            for (const tensor of Object.values(outputs)) tensor.dispose();
            const finishedAt = performance.now();
            worker.postMessage({
                type: 'result',
                cups,
                inferenceMs: finishedAt - start,
                preprocessMs: preparedAt - start,
                modelRunMs: inferredAt - preparedAt,
                postprocessMs: finishedAt - inferredAt,
            });
        }
    } catch (error) {
        worker.postMessage({
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
        });
    } finally {
        busy = false;
    }
}
worker.onmessage = (event) => {
    void process(event);
};
