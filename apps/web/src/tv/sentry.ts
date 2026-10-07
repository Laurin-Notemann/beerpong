import * as Sentry from '@sentry/browser';

/**
 * Reports the TV's errors to Sentry (project `web`). Loaded by the TV's layout route only, as
 * its own chunk, so the simulator never downloads it. The DSN and the commit are baked in at
 * build time (`VITE_SENTRY_DSN`, `VITE_GIT_COMMIT`, passed by Web Staging Deploy); without a
 * DSN (local dev) nothing is sent. The SDK's modern syntax is compiled down to Chromium 63 with
 * the rest of the client (vite.config.ts), and the polyfills load first (routes/tv.tsx).
 */
export function initTvSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) return;
    const commit = import.meta.env.VITE_GIT_COMMIT;
    Sentry.init({
        dsn,
        environment: import.meta.env.MODE === 'production' ? 'staging' : 'development',
        release: commit ? `web@${commit}` : undefined,
        // through this server, past content blockers (routes/tv/api/reports.ts)
        tunnel: '/tv/api/reports',
        // no traces: a TV is one long-lived page, and old TV browsers are slow enough
        tracesSampleRate: 0,
        // the camera feed's stats, from the TV and the camera (lib/feedTelemetry.ts)
        enableLogs: true,
    });
    Sentry.setTag('app', 'tv');
}
