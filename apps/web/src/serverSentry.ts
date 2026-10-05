import * as Sentry from '@sentry/node';
import { isNotFound, isRedirect } from '@tanstack/react-router';

import { DisplayError } from '~/tv/server/displays';

/**
 * Reports what fails on this app's server (server functions, rendering a page) to the Sentry
 * project `web`, where the TV's browser reports too (tv/sentry.ts). Only start.ts's middleware
 * loads it, from their server part, so it stays out of the client bundle. The DSN is the one
 * Web Staging Deploy bakes in; without it (local dev) nothing is sent.
 */
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
    const commit = import.meta.env.VITE_GIT_COMMIT;
    Sentry.init({
        dsn,
        environment: import.meta.env.MODE === 'production' ? 'staging' : 'development',
        release: commit ? `web@${commit}` : undefined,
        // errors only
        tracesSampleRate: 0,
        initialScope: { tags: { app: 'server' } },
    });
}

/** `where` is the page or the server function; request bodies carry the TVs' tokens, so no body */
export function captureServerError(error: unknown, where: string) {
    // redirects and not-founds are answers; a display the server forgot registers again (tv/lib/hooks.ts)
    if (error instanceof Response || isRedirect(error) || isNotFound(error)) return;
    if (error instanceof DisplayError) return;
    Sentry.withScope((scope) => {
        scope.setTag('where', where);
        Sentry.captureException(error);
    });
}
