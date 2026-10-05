import { timingSafeEqual } from 'node:crypto';

import { type DisplayConfig, type DisplayPatch, parseConfig } from '~/lib/display';

/**
 * The TVs this server knows, in memory. A TV keeps its own copy of everything (config and the
 * API session) in localStorage and registers it again when it reconnects, so a restart of this
 * server only costs a reconnect.
 *
 * Each TV has two secrets: `key` is in the QR code and lets a phone control it, `secret` never
 * leaves the TV and is what it registers and reads the API session with.
 */
export interface Display {
    id: string;
    key: string;
    secret: string;
    config: DisplayConfig;
    /** the TV's own API user (see api.ts `signup`) */
    refreshToken: string | null;
    listeners: Set<(event: DisplayEvent) => void>;
    lastSeen: number;
}

export type DisplayEvent =
    | { type: 'config'; config: DisplayConfig }
    /** only sent to the TV itself, so it can keep its session across server restarts */
    | { type: 'session'; refreshToken: string };

// kept on globalThis so dev reloads of this module don't forget the TVs
const g = globalThis as typeof globalThis & { __versusDisplays?: Map<string, Display> };
const displays = (g.__versusDisplays ??= new Map());

export class DisplayError extends Error {}

const same = (a: string, b: string) =>
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const isToken = (v: unknown): v is string =>
    typeof v === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(v);

// TVs nobody has watched for this long are forgotten; one that comes back registers again
const FORGET_AFTER = 2 * 24 * 60 * 60_000;

function forgetIdle() {
    const cutoff = Date.now() - FORGET_AFTER;
    for (const [id, display] of displays) {
        if (!display.listeners.size && display.lastSeen < cutoff) displays.delete(id);
    }
}

/** a TV (re)announcing itself; the server's config wins, it may be newer than the TV's copy */
export function register(input: {
    id: unknown;
    key: unknown;
    secret: unknown;
    config: unknown;
    refreshToken: unknown;
}): Display {
    const { id, key, secret } = input;
    if (!isToken(id) || !isToken(key) || !isToken(secret)) {
        throw new DisplayError('invalid display');
    }
    forgetIdle();
    const known = displays.get(id);
    if (known) {
        known.lastSeen = Date.now();
        if (!same(known.secret, secret)) throw new DisplayError('display id taken');
        known.key = key;
        known.refreshToken ??= typeof input.refreshToken === 'string' ? input.refreshToken : null;
        return known;
    }
    const display: Display = {
        id,
        key,
        secret,
        config: parseConfig(input.config),
        refreshToken: typeof input.refreshToken === 'string' ? input.refreshToken : null,
        listeners: new Set(),
        lastSeen: Date.now(),
    };
    displays.set(id, display);
    return display;
}

/** the display, if `key` is its key (a phone) or its secret (the TV) */
export function authorize(id: unknown, keyOrSecret: unknown) {
    const display = typeof id === 'string' ? displays.get(id) : undefined;
    if (
        !display ||
        typeof keyOrSecret !== 'string' ||
        !(same(display.key, keyOrSecret) || same(display.secret, keyOrSecret))
    ) {
        throw new DisplayError('unknown display');
    }
    display.lastSeen = Date.now();
    return { display, isTv: same(display.secret, keyOrSecret) };
}

export function update(display: Display, patch: DisplayPatch & Partial<DisplayConfig>) {
    display.config = { ...display.config, ...patch };
    emit(display, { type: 'config', config: display.config });
}

export function setSession(display: Display, refreshToken: string) {
    display.refreshToken = refreshToken;
    emit(display, { type: 'session', refreshToken });
}

function emit(display: Display, event: DisplayEvent) {
    for (const listener of display.listeners) listener(event);
}

/** listens to a display's changes; returns the unsubscribe */
export function subscribe(display: Display, listener: (event: DisplayEvent) => void) {
    display.listeners.add(listener);
    return () => display.listeners.delete(listener);
}
