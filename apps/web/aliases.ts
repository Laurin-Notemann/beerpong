import { fileURLToPath } from 'node:url';

// `~/` is this app, `@/` the mobile app: the TV reduces the live match log with its code (see
// src/tv/lib/liveMatch.ts), so it never disagrees with the phones about a score. Explicit, not
// from tsconfig paths, so `@/` imports inside apps/mobile/ resolve without its tsconfig.
export const aliases = [
    { find: /^~\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
    { find: /^@\//, replacement: fileURLToPath(new URL('../mobile/', import.meta.url)) },
];
