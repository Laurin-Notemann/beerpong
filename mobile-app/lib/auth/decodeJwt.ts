export type JwtPayload = { sub?: string; exp?: number; iat?: number };

/** Reads a JWT's payload without verifying it; the server verifies tokens, the app only needs `exp` and `sub`. */
export function decodeJwt(token: string): JwtPayload {
    const payload = token.split('.')[1];
    if (!payload) throw new Error('Not a JWT');

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    return JSON.parse(atob(padded));
}
