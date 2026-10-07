import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

// Only the camera downloads this runtime. Keep WASM next to the model on our own origin.
const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('onnxruntime-web/wasm'));
const destination = resolve('public/vision/runtime/1.24.3');
await mkdir(destination, { recursive: true });
for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
    await copyFile(resolve(dist, name), resolve(destination, name));
}
