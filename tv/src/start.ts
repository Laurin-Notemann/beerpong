import { createCsrfMiddleware, createStart } from '@tanstack/react-start';

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

export const startInstance = createStart(() => ({ requestMiddleware: [csrfMiddleware] }));
