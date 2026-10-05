import { fileURLToPath } from 'node:url';

// `~/` is this app, `@/` the mobile app: running live matches are reduced with its code (see
// src/liveMatch.ts), like the TV does. Explicit, not from tsconfig paths, so `@/` imports inside
// mobile-app/ resolve without its tsconfig.
export const aliases = [
    { find: /^~\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
    { find: /^@\//, replacement: fileURLToPath(new URL('../mobile-app/', import.meta.url)) },
];
