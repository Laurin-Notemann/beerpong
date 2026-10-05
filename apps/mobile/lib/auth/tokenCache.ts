import { JwtPayload } from '@/lib/auth/decodeJwt';

/** A token is renewed this long before it expires. */
const RENEW_BEFORE_EXPIRY_MS = 60_000;

/**
 * When an access token stops working, on the device's clock. `iat` and `exp` are the server's
 * clock; on a phone whose clock is off, comparing `exp` with `Date.now()` treats a fresh token
 * as expired or an expired one as valid for hours. So the token's lifetime is counted from when
 * it arrived.
 */
export function tokenExpiresAt(payload: JwtPayload, receivedAt: number) {
    if (payload.exp == null) return receivedAt;
    if (payload.iat == null) return payload.exp * 1000;
    return receivedAt + (payload.exp - payload.iat) * 1000;
}

export interface CachedToken {
    accessToken: string;
    /** device clock, see `tokenExpiresAt` */
    expiresAt: number;
}

/** One access token for every request; concurrent callers share one refresh. */
export function createTokenCache<T extends CachedToken>(
    now: () => number = Date.now
) {
    let cached: T | null = null;
    let pending: Promise<T> | null = null;

    return {
        get(fetchToken: () => Promise<T>): Promise<T> {
            if (cached && cached.expiresAt - now() > RENEW_BEFORE_EXPIRY_MS) {
                return Promise.resolve(cached);
            }
            pending ??= fetchToken()
                .then((token) => {
                    cached = token;
                    return token;
                })
                .finally(() => {
                    pending = null;
                });
            return pending;
        },
        /**
         * Drops `accessToken` (e.g. the API answered 401 to it), so the next `get` fetches a
         * new one. A newer token that replaced it in the meantime stays.
         */
        invalidate(accessToken: string) {
            if (cached?.accessToken === accessToken) cached = null;
        },
        peek: () => cached,
    };
}
