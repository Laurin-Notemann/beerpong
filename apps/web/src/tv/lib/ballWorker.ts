import { BallHistory, BallTracker, type BallColor, type HitEntry } from '~/tv/lib/ballVision';
import type { Cup, PlayingArea } from '~/tv/lib/cupVision';
import { HitProposer } from '~/tv/lib/hitProposals';

const history = new BallHistory();
const tracker = new BallTracker();
const proposer = new HitProposer();
let contextKey = '';
let historyKey = '';
let previous: Uint8ClampedArray | null = null;
let lastAt = 0;
let surface: OffscreenCanvas | null = null;
let colorPolicy: BallColor = 'both';
const reset = (context: string, color: BallColor, historyContext: string) => {
    proposer.reset();
    tracker.reset();
    if (historyContext !== historyKey || color !== colorPolicy) history.reset();
    historyKey = historyContext;
    previous = null;
    lastAt = 0;
    contextKey = context;
    colorPolicy = color;
};
self.onmessage = ({
    data,
}: MessageEvent<
    | {
          type: 'frame';
          context: string;
          frameId: number;
          pixels?: Uint8ClampedArray;
          bitmap?: ImageBitmap;
          width: number;
          height: number;
          at: number;
          areas: PlayingArea[];
          ballColor?: BallColor;
          historyContext?: string;
      }
    | { type: 'init' }
    | { type: 'cups'; at: number; cups: Cup[]; context: string }
    | { type: 'reset'; context: string; ballColor?: BallColor; historyContext?: string }
    | {
          type: 'hit';
          entry: HitEntry;
          area: PlayingArea;
          at: number;
          aspect: number;
          historyContext: string;
      }
>) => {
    try {
        if (data.type === 'init') {
            let canvas = false;
            try {
                const probe =
                    typeof OffscreenCanvas === 'undefined' ? null : new OffscreenCanvas(2, 2);
                canvas = Boolean(probe?.getContext('2d', { willReadFrequently: true }));
            } catch {
                // Pixel transfers still work when worker canvas contexts are unavailable.
            }
            self.postMessage({ type: 'ready', canvas });
            return;
        }
        if (data.type === 'reset') {
            reset(data.context, data.ballColor ?? 'both', data.historyContext ?? data.context);
            return;
        }
        if (data.type === 'cups') {
            if (data.context === contextKey) {
                proposer.setCups(data.at, data.cups);
                history.cups(data.at, data.cups);
            }
            return;
        }
        if (data.type === 'hit') {
            if (data.historyContext !== historyKey) return;
            self.postMessage({
                type: 'hit',
                historyContext: historyKey,
                result: history.analyze(data.entry, data.area, data.at, data.aspect),
            });
            return;
        }
        if (
            data.context !== contextKey ||
            (data.ballColor ?? 'both') !== colorPolicy ||
            (data.historyContext ?? data.context) !== historyKey
        ) {
            data.bitmap?.close();
            return;
        }
        const start = performance.now();
        // A changed input size or background pause invalidates frame differencing.
        let pixels = data.pixels;
        if (data.bitmap) {
            if (!surface || surface.width !== data.width || surface.height !== data.height)
                surface = new OffscreenCanvas(data.width, data.height);
            const context = surface.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Ball worker canvas unavailable');
            try {
                context.drawImage(data.bitmap, 0, 0, data.width, data.height);
                pixels = context.getImageData(0, 0, data.width, data.height).data;
            } finally {
                data.bitmap.close();
            }
        }
        if (!pixels) throw new Error('Ball frame missing');
        if (
            previous &&
            (previous.length !== pixels.length || data.at <= lastAt || data.at - lastAt > 300)
        ) {
            previous = null;
            tracker.reset();
            history.reset();
            proposer.reset();
        }
        const result = tracker.detect(
            pixels,
            previous,
            data.width,
            data.height,
            data.areas,
            data.at,
            colorPolicy
        );
        previous = pixels;
        lastAt = data.at;
        history.add(
            data.at,
            result.balls,
            result.obscured || result.ambiguous,
            result.trajectories
        );
        self.postMessage({
            type: 'frame',
            frameId: data.frameId,
            at: data.at,
            context: data.context,
            balls: result.balls,
            proposals: proposer.observe(
                data.at,
                result.balls,
                result.obscured || result.ambiguous,
                data.width / data.height,
                result.trajectories
            ),
            count: result.balls.length,
            candidateCount: result.candidateCount,
            ambiguous: result.ambiguous,
            staticCount: result.balls.filter((ball) => ball.source === 'static-color-appearance')
                .length,
            movingCount: result.balls.filter((ball) => ball.source !== 'static-color-appearance')
                .length,
            obscured: result.obscured,
            processingMs: performance.now() - start,
        });
    } catch (error) {
        self.postMessage({ type: 'error', phase: data.type, message: String(error) });
    }
};
