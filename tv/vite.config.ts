import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { aliases } from './aliases';

export default defineConfig({
    server: { port: 3100 },
    resolve: { alias: aliases },
    plugins: [tanstackStart(), nitro(), viteReact(), tailwindcss()],
});
