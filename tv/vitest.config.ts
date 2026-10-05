import { defineConfig } from 'vitest/config';

import { aliases } from './aliases';

export default defineConfig({ resolve: { alias: aliases } });
