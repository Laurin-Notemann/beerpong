import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { aliases } from './aliases';

export default defineConfig({
    // served under /tv on the API's hostname (see tv/README.md), locally too
    base: '/tv/',
    server: { port: 3100 },
    // one tsconfig for every file, also the shared ones in mobile-app/ (whose tsconfig extends
    // Expo's, which isn't installed here)
    tsconfig: './tsconfig.json',
    resolve: { alias: aliases },
    plugins: [tanstackStart(), nitro({ baseURL: '/tv/' }), viteReact(), tailwindcss()],
});
