import { defineConfig } from 'vitest/config';

import { aliases } from './aliases';

// one tsconfig for every file: see vite.config.ts
export default defineConfig({ tsconfig: './tsconfig.json', resolve: { alias: aliases } });
