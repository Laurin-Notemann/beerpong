import axios, {
    AxiosAdapter,
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, it, vi } from 'vitest';

import {
    ApiErrorReporter,
    installApiInterceptors,
    routeTemplate,
} from '@/api/utils/apiInterceptors';

const GROUP = 'c60a9d60-b511-42e4-aa05-0c7f22ba67c4';
const SEASON = 'ba19e6c2-cb15-45e6-8752-b0965e309c68';
const PLAYER = '28f5db58-a1e9-45c9-b89e-f54f965581e8';

type Answer =
    { status: number; data?: unknown } | { noResponse: true; code?: string };

/** An API client whose server answers with `answers`, one per request. */
function setup(answers: Answer[], options: { offline?: boolean } = {}) {
    const sent: InternalAxiosRequestConfig[] = [];
    const adapter: AxiosAdapter = async (config) => {
        sent.push(config);
        const answer = answers.shift() ?? { status: 200 };
        if ('noResponse' in answer) {
            throw new AxiosError(
                'Network Error',
                answer.code ?? AxiosError.ERR_NETWORK,
                config,
                {}
            );
        }
        const response = {
            data: answer.data ?? {},
            status: answer.status,
            statusText: '',
            headers: {},
            config,
        };
        if (answer.status >= 400) {
            throw new AxiosError(
                `Request failed with status code ${answer.status}`,
                AxiosError.ERR_BAD_REQUEST,
                config,
                {},
                response
            );
        }
        return response;
    };
    const client = axios.create({ adapter });

    let token = 0;
    const reporter = {
        captureException: vi.fn(),
        addBreadcrumb: vi.fn(),
    } satisfies ApiErrorReporter;
    const invalidateAccessToken = vi.fn();

    installApiInterceptors(client, {
        getAccessToken: async () => `token${++token}`,
        invalidateAccessToken: (t) => {
            invalidateAccessToken(t);
        },
        isOffline: async () => options.offline ?? false,
        reporter,
        log: () => {},
    });
    return { client, sent, reporter, invalidateAccessToken };
}

const errorBody = (code: string) => ({ status: 'ERROR', error: { code } });

describe('routeTemplate', () => {
    it('replaces ids, so one route groups as one Sentry issue', () => {
        expect(
            routeTemplate(
                `https://api.example/groups/${GROUP}/seasons/${SEASON}/players/${PLAYER}?x=1`
            )
        ).toBe('/groups/{id}/seasons/{id}/players/{id}');
    });
});

describe('API error reporting', () => {
    it('reports a 5xx, grouped by method, route and status', async () => {
        const { client, reporter } = setup([{ status: 500 }]);

        await expect(
            client.get(`/groups/${GROUP}/leaderboard`)
        ).rejects.toThrow();

        expect(reporter.captureException).toHaveBeenCalledTimes(1);
        const [error, context] = reporter.captureException.mock.calls[0];
        expect(context.fingerprint).toEqual([
            'api',
            'GET /groups/{id}/leaderboard',
            '500',
        ]);
        expect(String(error)).toContain(
            'GET /groups/{id}/leaderboard failed: 500'
        );
    });

    it('reports an unexpected 4xx by its error code', async () => {
        const { client, reporter } = setup([
            { status: 403, data: errorBody('playerAlreadyDeleted') },
        ]);

        await expect(
            client.delete(
                `/groups/${GROUP}/seasons/${SEASON}/players/${PLAYER}`
            )
        ).rejects.toThrow();

        expect(reporter.captureException.mock.calls[0][1].fingerprint).toEqual([
            'api',
            'DELETE /groups/{id}/seasons/{id}/players/{id}',
            'playerAlreadyDeleted',
        ]);
    });

    it('leaves a breadcrumb for an expected 4xx', async () => {
        const { client, reporter } = setup([
            { status: 404, data: errorBody('matchNotFound') },
        ]);

        await expect(
            client.get(`/groups/${GROUP}/matches/x`)
        ).rejects.toThrow();

        expect(reporter.captureException).not.toHaveBeenCalled();
        expect(reporter.addBreadcrumb).toHaveBeenCalledTimes(1);
    });

    it('leaves a breadcrumb when there is no response and the phone is offline', async () => {
        const { client, reporter } = setup([{ noResponse: true }], {
            offline: true,
        });

        await expect(client.post(`/groups/${GROUP}/matches`)).rejects.toThrow();

        expect(reporter.captureException).not.toHaveBeenCalled();
        expect(reporter.addBreadcrumb).toHaveBeenCalledTimes(1);
    });

    it('reports no response while online, by its error code', async () => {
        const { client, reporter } = setup([
            { noResponse: true, code: AxiosError.ECONNABORTED },
        ]);

        await expect(client.get('/groups/user')).rejects.toThrow();

        expect(reporter.captureException.mock.calls[0][1].fingerprint).toEqual([
            'api',
            'GET /groups/user',
            'ECONNABORTED',
        ]);
    });
});

describe('a rejected access token', () => {
    it('is dropped, and the request retried once with a new token', async () => {
        const { client, sent, reporter, invalidateAccessToken } = setup([
            { status: 401 },
            { status: 200, data: { ok: true } },
        ]);

        const res = await client.get('/groups/user');

        expect(res.data).toEqual({ ok: true });
        expect(invalidateAccessToken).toHaveBeenCalledWith('token1');
        expect(sent.map((i) => i.headers.Authorization)).toEqual([
            'Bearer token1',
            'Bearer token2',
        ]);
        expect(reporter.captureException).not.toHaveBeenCalled();
    });

    it('is retried only once, then reported', async () => {
        const { client, sent, reporter } = setup([
            { status: 401 },
            { status: 401 },
            { status: 401 },
        ]);

        await expect(client.get('/groups/user')).rejects.toThrow();

        expect(sent).toHaveLength(2);
        expect(reporter.captureException).toHaveBeenCalledTimes(1);
    });

    it("isn't the cause of a 401 with an error code", async () => {
        const { client, sent } = setup([
            { status: 401, data: errorBody('authUserNotInGroup') },
        ]);

        await expect(client.get(`/groups/${GROUP}`)).rejects.toThrow();

        expect(sent).toHaveLength(1);
    });
});
