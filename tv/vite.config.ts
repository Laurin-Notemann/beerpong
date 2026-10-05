import postcssCascadeLayers from '@csstools/postcss-cascade-layers';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { aliases } from './aliases';
import { flexGapFallback } from './flexGapFallback';

// TVs run old browsers: smart TVs from 2018 on have Chromium 69 or newer. The client is
// compiled down to what those parse, gets polyfills first (src/client.tsx), and its CSS loses
// Tailwind's cascade layers (Chromium 99+), which older browsers drop with everything in them,
// and gets margins where flexbox gap is missing (flexGapFallback.ts).
const browsers = ['chrome69', 'safari12', 'firefox68'];

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
    plugins: [tanstackStart(), nitro({ baseURL: '/tv/' }), viteReact(), tailwindcss()],
});
