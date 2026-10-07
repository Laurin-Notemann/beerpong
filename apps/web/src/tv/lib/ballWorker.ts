import { BallHistory, BallTracker, type HitEntry } from '~/tv/lib/ballVision';
import type { Cup, PlayingArea } from '~/tv/lib/cupVision';

const history = new BallHistory();
const tracker = new BallTracker();
let previous: Uint8ClampedArray | null = null;
let lastAt = 0;
let surface: OffscreenCanvas | null = null;
self.onmessage = ({
    data,
}: MessageEvent<
    | {
          type: 'frame';
          frameId: number;
          pixels?: Uint8ClampedArray;
          bitmap?: ImageBitmap;
          width: number;
          height: number;
          at: number;
          areas: PlayingArea[];
      }
    | { type: 'init' }
    | { type: 'cups'; at: number; cups: Cup[] }
    | { type: 'hit'; entry: HitEntry; area: PlayingArea; at: number; aspect: number }
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
        if (data.type === 'cups') {
            history.cups(data.at, data.cups);
            return;
        }
        if (data.type === 'hit') {
            self.postMessage({
                type: 'hit',
                result: history.analyze(data.entry, data.area, data.at, data.aspect),
            });
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
        if (previous?.length !== pixels.length || data.at - lastAt > 300) previous = null;
        const result = tracker.detect(
            pixels,
            previous,
            data.width,
            data.height,
            data.areas,
            data.at
        );
        previous = pixels;
        lastAt = data.at;
        history.add(data.at, result.balls, result.obscured);
        self.postMessage({
            type: 'frame',
            frameId: data.frameId,
            count: result.balls.length,
            obscured: result.obscured,
            processingMs: performance.now() - start,
        });
    } catch (error) {
        self.postMessage({ type: 'error', phase: data.type, message: String(error) });
    }
};
