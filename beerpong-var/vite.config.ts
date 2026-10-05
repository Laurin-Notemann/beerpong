import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { aliases } from './aliases';

export default defineConfig({
    server: { port: 3000 },
    // one tsconfig for every file, also the shared ones in mobile-app/ (whose tsconfig extends
    // Expo's, which isn't installed here)
    tsconfig: './tsconfig.json',
    resolve: { alias: aliases },
    // react's plugin must come after start's
    plugins: [tanstackStart(), nitro(), viteReact()],
});
