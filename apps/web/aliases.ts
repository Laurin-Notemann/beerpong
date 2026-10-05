import { fileURLToPath } from 'node:url';

// `~/` is this app, `@/` the mobile app: the TV and the simulator reduce live match logs with its
// code (see src/tv/lib/liveMatch.ts, src/simulator/liveMatch.ts), so they never disagree with the
// phones about a score. Explicit, not from tsconfig paths, so `@/` imports inside apps/mobile/
// resolve without its tsconfig.
export const aliases = [
    { find: /^~\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
    { find: /^@\//, replacement: fileURLToPath(new URL('../mobile/', import.meta.url)) },
];
