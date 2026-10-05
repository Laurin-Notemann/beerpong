import { describe, expect, it, vi } from 'vitest';

import { createTokenCache, tokenExpiresAt } from '@/lib/auth/tokenCache';

const HOUR = 3600;

/** a token the server issued at `serverNow` (seconds), valid for an hour */
const issue = (accessToken: string, serverNow: number, receivedAt: number) => ({
    accessToken,
    expiresAt: tokenExpiresAt(
        { iat: serverNow, exp: serverNow + HOUR },
        receivedAt
    ),
});

describe('access token expiry', () => {
    it('counts the lifetime from when the token arrived, not from the server clock', () => {
        const deviceNow = Date.UTC(2026, 9, 5, 12);
        // the phone's clock is three hours behind the server
        const serverNow = deviceNow / 1000 + 3 * HOUR;

        expect(
            tokenExpiresAt({ iat: serverNow, exp: serverNow + HOUR }, deviceNow)
        ).toBe(deviceNow + HOUR * 1000);
    });

    it('falls back to exp when the token has no iat', () => {
        expect(tokenExpiresAt({ exp: 2000 }, 5)).toBe(2_000_000);
    });
});

describe('createTokenCache', () => {
    it('reuses a token on a phone whose clock is hours off, and renews it near its end', async () => {
        let deviceNow = Date.UTC(2026, 9, 5, 12);
        const serverNow = deviceNow / 1000 - 5 * HOUR; // the phone is five hours ahead
        const cache = createTokenCache<ReturnType<typeof issue>>(
            () => deviceNow
        );
        const fetchToken = vi.fn(async () =>
            issue(`token${fetchToken.mock.calls.length}`, serverNow, deviceNow)
        );

        expect((await cache.get(fetchToken)).accessToken).toBe('token1');
        deviceNow += 30 * 60 * 1000;
        expect((await cache.get(fetchToken)).accessToken).toBe('token1');
        expect(fetchToken).toHaveBeenCalledTimes(1);

        // less than a minute left
        deviceNow += 29.5 * 60 * 1000;
        expect((await cache.get(fetchToken)).accessToken).toBe('token2');
    });

    it('shares one refresh between concurrent callers', async () => {
        const cache = createTokenCache<ReturnType<typeof issue>>(() => 0);
        const fetchToken = vi.fn(async () => issue('token', 0, 0));

        const tokens = await Promise.all([
            cache.get(fetchToken),
            cache.get(fetchToken),
            cache.get(fetchToken),
        ]);

        expect(fetchToken).toHaveBeenCalledTimes(1);
        expect(new Set(tokens.map((i) => i.accessToken))).toEqual(
            new Set(['token'])
        );
    });

    it('drops a rejected token, but not a newer one that replaced it', async () => {
        const cache = createTokenCache<ReturnType<typeof issue>>(() => 0);
        let next = 'a';
        const fetchToken = vi.fn(async () => issue(next, 0, 0));

        await cache.get(fetchToken);
        next = 'b';
        cache.invalidate('a');
        expect((await cache.get(fetchToken)).accessToken).toBe('b');

        // a request that still carried "a" fails late
        cache.invalidate('a');
        expect((await cache.get(fetchToken)).accessToken).toBe('b');
        expect(fetchToken).toHaveBeenCalledTimes(2);
    });
});
