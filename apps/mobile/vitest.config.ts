import path from 'path';
import { defineConfig } from 'vitest/config';

const isCIPipeline = process.env.TEST_ENV === 'CI';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname),
        },
    },
    test: {
        environment: 'jsdom',

        include: [
            '**/*.test.(ts|tsx)',
            // .local.test files should only be run locally
            isCIPipeline
                ? '!**/*.local.test.(ts|tsx)'
                : '**/*.local.test.(ts|tsx)',
        ],
    },
});
