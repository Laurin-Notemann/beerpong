import { AxiosError, AxiosInstance, isAxiosError } from 'axios';

declare module 'axios' {
    interface AxiosRequestConfig {
        /**
         * The caller retries this request in the background until it goes through (the live
         * match sync), so getting no response while offline is expected and isn't reported.
         */
        retriedUntilOnline?: boolean;
        /** set on the one retry after a 401 */
        retriedAfterUnauthorized?: boolean;
    }
}

/**
 * 4xx answers that happen in normal use: the data changed under the user, or they typed
 * something wrong. Every other 4xx means the app sent a request it shouldn't have.
 */
const EXPECTED_ERROR_CODES = new Set([
    // a mistyped group code
    'groupInviteNotFound',
    // deleted by another group member while this phone still showed it
    'matchNotFound',
    'liveMatchNotFound',
    // the TV went off while the TV remote showed it
    'tvNotFound',
    // a mistyped TV code (Add TV)
    'tvCodeNotFound',
    // the app signs up again (useAuth)
    'authRefreshInvalidToken',
]);

const UUID =
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi;

/** `/groups/c60a…/seasons/ba19…/players` -> `/groups/{id}/seasons/{id}/players` */
export function routeTemplate(url: string | undefined) {
    const path = (url ?? '').replace(/^[a-z]+:\/\/[^/]+/i, '').split('?')[0];
    return path.replace(UUID, '/{id}').replace(/\/\d+(?=\/|$)/g, '/{id}');
}

/** The backend's error code (`ResponseEnvelope.error.code`), if the body has one. */
export function apiErrorCode(err: AxiosError): string | undefined {
    const error = (err.response?.data as { error?: unknown } | undefined)
        ?.error;
    if (error && typeof error === 'object' && 'code' in error) {
        return String(error.code);
    }
    return undefined;
}

export type ApiErrorVerdict =
    | { report: true; fingerprint: string[]; title: string }
    | { report: false; reason: string };

/**
 * Whether a failed request is a bug worth a Sentry issue. Issues are grouped by method, route
 * and status or error code, so a 404 on one route doesn't pile up with every other 404.
 */
export function classifyApiError(
    err: AxiosError,
    isOffline: boolean
): ApiErrorVerdict {
    const method = (err.config?.method ?? 'get').toUpperCase();
    const route = routeTemplate(err.config?.url);
    const request = `${method} ${route}`;

    if (err.response) {
        const { status } = err.response;
        const code = apiErrorCode(err);
        if (status < 500) {
            if (err.config?.retriedUntilOnline) {
                return { report: false, reason: 'the caller reports it' };
            }
            if (code && EXPECTED_ERROR_CODES.has(code)) {
                return { report: false, reason: `expected ${code}` };
            }
        }
        const detail = code ? `${status} ${code}` : `${status}`;
        return {
            report: true,
            fingerprint: ['api', request, code ?? String(status)],
            title: `${request} failed: ${detail}`,
        };
    }
    if (isOffline || err.config?.retriedUntilOnline) {
        return { report: false, reason: 'offline' };
    }
    // online, but no answer: the server or the network in between is down
    const kind = err.code ?? 'no response';
    return {
        report: true,
        fingerprint: ['api', request, kind],
        title: `${request} got no response: ${kind}`,
    };
}

export interface ApiErrorReporter {
    captureException(
        err: unknown,
        context: { fingerprint: string[]; extra: Record<string, unknown> }
    ): void;
    addBreadcrumb(breadcrumb: {
        category: string;
        message: string;
        level: 'warning';
        data: Record<string, unknown>;
    }): void;
}

/** A failed request, named after its route so Sentry titles say which one. */
export class ApiRequestError extends Error {
    constructor(message: string, cause: AxiosError) {
        super(message);
        this.name = 'ApiRequestError';
        this.cause = cause;
    }
}

/**
 * Authenticates every request and reports the failures that are bugs (`classifyApiError`).
 * A 401 means the token was rejected (revoked, or the phone's clock made it look valid), so
 * it's dropped and the request retried once with a new one.
 */
export function installApiInterceptors(
    client: AxiosInstance,
    deps: {
        getAccessToken: () => Promise<string>;
        invalidateAccessToken: (accessToken: string) => void;
        isOffline: () => Promise<boolean>;
        reporter: ApiErrorReporter;
        log: (...args: unknown[]) => void;
    }
) {
    client.interceptors.request.use(async (config) => {
        config.headers.Authorization =
            'Bearer ' + (await deps.getAccessToken());
        return config;
    });

    client.interceptors.response.use(undefined, async (err: unknown) => {
        if (!isAxiosError<unknown>(err)) {
            // getting a token failed outside of a request (e.g. decoding it)
            deps.log('[api] request setup failed:', err);
            deps.reporter.captureException(err, {
                fingerprint: ['{{ default }}'],
                extra: {},
            });
            throw err instanceof Error ? err : new Error(String(err));
        }
        // Also gets the errors of the request interceptor (getting a token), whose config is
        // the token request's and carries no Authorization header. A 401 with an error code
        // (authUserNotInGroup) isn't about the token.
        if (err.config) {
            const sentToken = String(err.config.headers?.Authorization ?? '');
            if (
                err.response?.status === 401 &&
                !apiErrorCode(err) &&
                sentToken.startsWith('Bearer ') &&
                !err.config.retriedAfterUnauthorized
            ) {
                deps.log(
                    '[api] 401, retrying with a new token:',
                    err.config.url
                );
                deps.invalidateAccessToken(sentToken.slice('Bearer '.length));
                return client.request({
                    ...err.config,
                    retriedAfterUnauthorized: true,
                });
            }
        }

        const offline = err.response ? false : await deps.isOffline();
        const verdict = classifyApiError(err, offline);
        const data = {
            method: err.config?.method,
            url: err.config?.url,
            status: err.response?.status,
            code: err.code,
            responseData: err.response?.data,
        };
        deps.log('[api] request failed:', data);
        if (verdict.report) {
            deps.reporter.captureException(
                new ApiRequestError(verdict.title, err),
                { fingerprint: verdict.fingerprint, extra: data }
            );
        } else {
            deps.reporter.addBreadcrumb({
                category: 'api',
                message: `request failed (${verdict.reason})`,
                level: 'warning',
                data,
            });
        }
        throw err;
    });
}
