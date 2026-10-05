import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';

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
 * Server errors go to Sentry (serverSentry.ts) and are thrown on unchanged, so every page and
 * server function answers as before. A server function's error never reaches the request
 * middleware (Start answers it as a response), so functions get their own. The module is
 * imported in the server part only, which the client bundle doesn't contain.
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
            (await import('~/serverSentry')).captureServerError(error, serverFnMeta.name);
            throw error;
        }
    }
);

export const startInstance = createStart(() => ({
    requestMiddleware: [reportRequestErrors, csrfMiddleware],
    functionMiddleware: [reportFunctionErrors],
}));
