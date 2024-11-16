import { defineConfig } from 'vitest/config';

const isCIPipeline = process.env.TEST_ENV === 'CI';

export default defineConfig({
    test: {
        include: isCIPipeline
            ? ['**/*.test.ts', '!**/*.local.test.ts']
            : ['**/*.test.ts', '**/*.local.test.ts'],
    },
});
