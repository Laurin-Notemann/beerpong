import postcssCascadeLayers from '@csstools/postcss-cascade-layers';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, type Plugin } from 'vite';

import { aliases } from './aliases';
import { flexGapFallback } from './flexGapFallback';

// TVs run old browsers: Samsung's Tizen 5 (2019 TVs) has Chromium 63. The client is compiled
// down to what those parse, gets polyfills first (scripts/polyfills.mjs, __root.tsx), its CSS
// loses Tailwind's cascade layers (Chromium 99+), which older browsers drop with everything in
// them, and gets margins where flexbox gap is missing (flexGapFallback.ts).
const browsers = ['chrome63', 'safari12', 'firefox68'];

/**
 * Vite's chunk preload helper reads import.meta (Chromium 64) to resolve relative chunk URLs;
 * ours are absolute (/tv/...), so the page's own URL resolves them just as well.
 */
const noImportMeta: Plugin = {
    name: 'tv:no-import-meta',
    applyToEnvironment: (environment) => environment.name === 'client',
    renderChunk: (code) =>
        code.includes('import.meta')
            ? code
                  .replaceAll('import.meta.resolve', 'undefined')
                  .replaceAll('import.meta.url', 'document.baseURI')
            : null,
};

export default defineConfig({
    // served under /tv on the API's hostname (see tv/README.md), locally too
    base: '/tv/',
    server: { port: 3100 },
    // one tsconfig for every file, also the shared ones in mobile-app/ (whose tsconfig extends
    // Expo's, which isn't installed here)
    tsconfig: './tsconfig.json',
    resolve: { alias: aliases },
    build: { target: browsers, cssTarget: browsers },
    css: { postcss: { plugins: [flexGapFallback(), postcssCascadeLayers()] } },
    plugins: [
        tanstackStart(),
        nitro({ baseURL: '/tv/' }),
        viteReact(),
        tailwindcss(),
        noImportMeta,
    ],
});
