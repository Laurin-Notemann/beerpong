import { fileURLToPath } from 'node:url';

// `~/` is this app, `@/` the mobile app: the live match log is reduced with its code (see
// src/lib/liveMatch.ts), so the TV never disagrees with the phones about a score. Explicit, not
// from tsconfig paths, so `@/` imports inside apps/mobile/ resolve without its tsconfig.
export const aliases = [
    { find: /^~\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
    { find: /^@\//, replacement: fileURLToPath(new URL('../mobile/', import.meta.url)) },
];
