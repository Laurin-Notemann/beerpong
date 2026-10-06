import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';

import { ApiError } from '~/tv/server/api';
import { DisplayError } from '~/tv/server/displays';

/**
 * Server functions only take requests from this site. Modern browsers say so with
 * Sec-Fetch-Site; TV browsers (Chromium before 76) only send Origin or Referer, which the
 * default check compares with the request URL, and that is http here: Traefik ends TLS in
 * front of this server. So their origin is checked by host, which is what tells sites apart.
 */
const csrfMiddleware = createCsrfMiddleware({
    filter: (ctx) => ctx.handlerType === 'serverFn',
    origin: (origin, ctx) => sameHost(origin, ctx.request.url),
});

function sameHost(origin: string, requestUrl: string) {
    try {
        return new URL(origin).host === new URL(requestUrl).host;
    } catch {
        return false;
    }
}

/**
 * Unexpected errors go to Sentry (serverSentry.ts); expected display/API rejections keep
 * their 4xx status. A server function's error never reaches the request middleware (Start
 * answers it as a response), so functions get their own. Sentry is loaded on the server only.
 */
const reportRequestErrors = createMiddleware().server(async ({ next, pathname }) => {
    try {
        return await next();
    } catch (error) {
        (await import('~/serverSentry')).captureServerError(error, pathname);
        throw error;
    }
});

const reportFunctionErrors = createMiddleware({ type: 'function' }).server(
    async ({ next, serverFnMeta }) => {
        try {
            return await next();
        } catch (error) {
            if (error instanceof DisplayError) setResponseStatus(error.status);
            else if (error instanceof ApiError && error.httpCode >= 400 && error.httpCode < 500) {
                setResponseStatus(error.httpCode);
            } else (await import('~/serverSentry')).captureServerError(error, serverFnMeta.name);
            throw error;
        }
    }
);

export const startInstance = createStart(() => ({
    requestMiddleware: [reportRequestErrors, csrfMiddleware],
    functionMiddleware: [reportFunctionErrors],
}));
