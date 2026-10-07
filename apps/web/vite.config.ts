import postcssCascadeLayers from '@csstools/postcss-cascade-layers';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, type Plugin } from 'vite';

import { aliases } from './aliases';
import { flexGapFallback } from './flexGapFallback';

// TVs run old browsers: Samsung's Tizen 5 (2019 TVs) has Chromium 63. The client (the simulator's
// pages too) is compiled down to what those parse, the TV's pages get polyfills first
// (scripts/polyfills.mjs, routes/tv.tsx), its CSS loses Tailwind's cascade layers (Chromium 99+),
// which older browsers drop with everything in them, and gets margins where flexbox gap is
// missing (flexGapFallback.ts).
const browsers = ['chrome63', 'safari12', 'firefox68'];

/**
 * Vite's chunk preload helper reads import.meta (Chromium 64) to resolve relative chunk URLs;
 * ours are absolute (/assets/...), so the page's own URL resolves them just as well.
 */
const noImportMeta: Plugin = {
    name: 'web:no-import-meta',
    applyToEnvironment: (environment) => environment.name === 'client',
    renderChunk: (code) =>
        code.includes('import.meta')
            ? code
                  .replaceAll('import.meta.resolve', 'undefined')
                  .replaceAll('import.meta.url', 'document.baseURI')
            : null,
};

export default defineConfig({
    // the simulator at /, the TV under /tv (routes/tv.tsx); see README.md
    server: { port: 3100 },
    // one tsconfig for every file, also the shared ones in apps/mobile/ (whose tsconfig extends
    // Expo's, which isn't installed here)
    tsconfig: './tsconfig.json',
    // External WASM glue keeps its own worker URL when Vite bundles the detector.
    resolve: {
        alias: aliases,
        conditions: [
            'onnxruntime-web-use-extern-wasm',
            'module',
            'browser',
            'development|production',
        ],
    },
    build: { target: browsers, cssTarget: browsers },
    css: { postcss: { plugins: [flexGapFallback(), postcssCascadeLayers()] } },
    plugins: [
        tanstackStart(),
        nitro({
            routeRules: {
                '/tv/camera': {
                    headers: {
                        'Cross-Origin-Opener-Policy': 'same-origin',
                        'Cross-Origin-Embedder-Policy': 'require-corp',
                    },
                },
                '/assets/**': { headers: { 'Cross-Origin-Embedder-Policy': 'require-corp' } },
                '/vision/runtime/**': {
                    headers: {
                        'Cross-Origin-Embedder-Policy': 'require-corp',
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                },
                '/vision/model.json': { headers: { 'Cache-Control': 'no-store' } },
                '/vision/**': {
                    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
                },
            },
        }),
        viteReact(),
        tailwindcss(),
        noImportMeta,
    ],
});
