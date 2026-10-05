// Builds public/polyfills.js for the oldest browsers the TV supports (see vite.config.ts):
// core-js, plus AbortController (Chromium 66), which core-js doesn't cover. The page loads it
// as a plain script before the app's modules, so everything exists before any of them runs.
import { appendFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import builder from 'core-js-builder';

const filename = new URL('../public/polyfills.js', import.meta.url).pathname;

await builder({
    modules: ['core-js/stable'],
    targets: 'chrome 63, safari 12, firefox 68',
    format: 'bundle',
    filename,
});
// only installs itself where AbortController is missing; also gives fetch its `signal`
const abort = createRequire(import.meta.url).resolve(
    'abortcontroller-polyfill/dist/umd-polyfill.js'
);
appendFileSync(filename, '\n' + readFileSync(abort, 'utf8'));
