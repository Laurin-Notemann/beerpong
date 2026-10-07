import { BallHistory, ballCandidates, type HitEntry } from '~/tv/lib/ballVision';
import type { Cup, PlayingArea } from '~/tv/lib/cupVision';

const history = new BallHistory();
let previous: Uint8ClampedArray | null = null;
let lastAt = 0;
let surface: OffscreenCanvas | null = null;
self.onmessage = ({
    data,
}: MessageEvent<
    | {
          type: 'frame';
          pixels?: Uint8ClampedArray;
          bitmap?: ImageBitmap;
          width: number;
          height: number;
          at: number;
          areas: PlayingArea[];
      }
    | { type: 'cups'; at: number; cups: Cup[] }
    | { type: 'hit'; entry: HitEntry; area: PlayingArea; at: number; aspect: number }
>) => {
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
    const result = ballCandidates(pixels, previous, data.width, data.height, data.areas);
    previous = pixels;
    lastAt = data.at;
    history.add(data.at, result.balls, result.obscured);
    self.postMessage({
        type: 'frame',
        count: result.balls.length,
        obscured: result.obscured,
        processingMs: performance.now() - start,
    });
};
