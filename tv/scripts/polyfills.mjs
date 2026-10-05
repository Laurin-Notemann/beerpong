// Builds public/polyfills.js: core-js for the oldest browsers the TV supports (see
// vite.config.ts). The page loads it as a plain script before the app's modules, so the
// built-ins exist before any of them runs.
import builder from 'core-js-builder';

await builder({
    modules: ['core-js/stable'],
    targets: 'chrome 69, safari 12, firefox 68',
    format: 'bundle',
    filename: new URL('../public/polyfills.js', import.meta.url).pathname,
});
