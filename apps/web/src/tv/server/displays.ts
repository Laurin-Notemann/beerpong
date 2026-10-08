import { randomInt, timingSafeEqual } from 'node:crypto';

import {
    type DisplayConfig,
    type DisplayPatch,
    type CameraPosition,
    parseConfig,
} from '@/lib/tvDisplay';
import type { CameraVision } from '~/tv/server/cameraVision';

/**
 * The TVs this server knows, in memory, and the cameras that film a table for them. A TV keeps
 * its own copy of everything (config and the API session) in localStorage and registers it again
 * when it reconnects, so a restart of this server only costs a reconnect.
 *
 * A TV's `secret` never leaves it; it registers and reads with it. Phones control TVs through
 * the app (appRemote.ts): a TV without a group shows its `code`, which the app's Add TV takes.
 *
 * A camera (`/tv/camera`, a laptop or a phone's browser) is added the same way, with Add Camera.
 * Its config keeps its group, subject and video orientation. It sends video over WebRTC, peer to
 * peer; this server only passes on what they say to connect (`signal`, routes/tv/camera.tsx and
 * lib/cameraFeed.ts).
 */
export interface Display {
    id: string;
    kind: 'tv' | 'camera';
    secret: string;
    /** what the TV shows to be added in the app; it keeps the one it got and asks for it again */
    code: string;
    config: DisplayConfig;
    /** the display's own API user (see api.ts `signup`) */
    refreshToken: string | null;
    listeners: Set<(event: DisplayEvent) => void>;
    /**
     * a phone watching a match in the app's Camera tab (`/tv?inApp=1`): a TV for the cameras,
     * but not one the remote lists or controls
     */
    viewer: boolean;
    /** what the app's remote calls it, from its browser (`deviceName`) */
    name: string;
    lastSeen: number;
    vision?: CameraVision;
    /** Last two authorized clock/match snapshots, bounded across an in-flight refresh. */
    cameraSnapshots?: {
        id: string;
        groupId: string;
        serverAt: number;
        matches: { id: string; seq: number }[];
    }[];
}

/** an offer or answer of the WebRTC connection between a camera and a TV */
export interface Signal {
    type: 'offer' | 'answer';
    sdp: string;
}

export type DisplayEvent =
    | { type: 'config'; config: DisplayConfig }
    /** the selected camera's settings, both when watching starts and when a phone changes them */
    | {
          type: 'cameraConfig';
          position?: CameraPosition | 'main';
          cameraId: string;
          config: DisplayConfig;
      }
    /** so the TV can keep its session across server restarts */
    | { type: 'session'; refreshToken: string }
    /** reload the page, to pick up a deploy */
    | { type: 'reload' }
    /** to a camera: this TV wants its video, send it an offer */
    | { type: 'watch'; tvId: string }
    /** from the TV or camera `from` */
    | { type: 'signal'; position?: CameraPosition | 'main'; from: string; signal: Signal };

// kept on globalThis so dev reloads of this module don't forget the TVs
const g = globalThis as typeof globalThis & { __versusDisplays?: Map<string, Display> };
const displays = (g.__versusDisplays ??= new Map<string, Display>());

export class DisplayError extends Error {
    constructor(
        message: string,
        readonly status = 400
    ) {
        super(message);
    }
}

const same = (a: string, b: string) =>
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const isToken = (v: unknown): v is string =>
    typeof v === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(v);

// typed into the app from across the room: capitals only, none that look alike (0 O 1 I)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;

/** the code the TV asks for, unless it's malformed (an older kind) or another TV or camera has it */
function codeFor(id: string, wanted: unknown) {
    const taken = (code: string) =>
        [...displays.values()].some((d) => d.id !== id && d.code === code);
    if (typeof wanted === 'string' && CODE.test(wanted) && !taken(wanted)) {
        return wanted;
    }
    let code;
    do {
        code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    } while (taken(code));
    return code;
}

/**
 * The TVs (or cameras) of this group with their page open, for the app's remote. That includes
 * a page in a background tab; one whose connection died without closing (a TV switched off)
 * counts until a ping to it fails. Phones watching a match (`viewer`) only with `viewers`.
 */
export function byGroup(
    groupId: string,
    kind: Display['kind'] = 'tv',
    { viewers = false } = {}
): Display[] {
    return [...displays.values()].filter(
        (d) =>
            d.kind === kind &&
            d.config.groupId === groupId &&
            d.listeners.size > 0 &&
            (viewers || !d.viewer)
    );
}

/** Reserve each corner's camera before choosing the main feed; never connect twice to one device. */
export function camerasFor(tv: Display) {
    const selected = new Map<CameraPosition | 'main', Display>();
    if (!tv.config.groupId) return selected;
    const online = byGroup(tv.config.groupId, 'camera');
    const used = new Set<string>();
    // Exact selections win over replacement fallbacks in other corners.
    for (const corner of tv.config.cameraCorners ?? []) {
        const camera = online.find((c) => c.id === corner.cameraId);
        if (camera && !used.has(camera.id)) {
            selected.set(corner.position, camera);
            used.add(camera.id);
        }
    }
    for (const corner of tv.config.cameraCorners ?? []) {
        if (selected.has(corner.position)) continue;
        const camera = online.find(
            (c) => !used.has(c.id) && c.config.cameraSubject === corner.subject
        );
        if (camera) {
            selected.set(corner.position, camera);
            used.add(camera.id);
        }
    }
    if (tv.config.cameraMainEnabled !== false) {
        const available = online.filter((c) => !used.has(c.id));
        const camera =
            available.find((c) => c.id === tv.config.cameraId) ??
            available.find((c) => c.config.cameraSubject === tv.config.cameraSubject) ??
            available[0];
        if (camera) selected.set('main', camera);
    }
    return selected;
}

export const cameraFor = (tv: Display, position: CameraPosition | 'main' = 'main') =>
    camerasFor(tv).get(position);

/**
 * A name for the TV from its browser's user agent, e.g. "Samsung TV" or "Chrome on Mac".
 * Browsers don't tell pages the device's own name.
 */
export function deviceName(userAgent: unknown) {
    const ua = typeof userAgent === 'string' ? userAgent : '';
    const tvs: [RegExp, string][] = [
        [/Tizen/, 'Samsung TV'],
        [/Web0S|webOS|NetCast/, 'LG TV'],
        [/AFT\w|Fire TV/, 'Fire TV'],
        [/CrKey/, 'Chromecast'],
        [/Android TV|GoogleTV|BRAVIA/, 'Android TV'],
        [/SMART-TV|SmartTV|HbbTV/, 'Smart TV'],
    ];
    const tv = tvs.find(([re]) => re.test(ua));
    if (tv) return tv[1];

    const browser = /Edg\//.test(ua)
        ? 'Edge'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /OPR\//.test(ua)
            ? 'Opera'
            : /Chrome\//.test(ua)
              ? 'Chrome'
              : /Safari\//.test(ua)
                ? 'Safari'
                : 'Browser';
    const os = /iPad/.test(ua)
        ? 'iPad'
        : /iPhone/.test(ua)
          ? 'iPhone'
          : /Android/.test(ua)
            ? 'Android'
            : /CrOS/.test(ua)
              ? 'Chromebook'
              : /Mac OS X/.test(ua)
                ? 'Mac'
                : /Windows/.test(ua)
                  ? 'Windows'
                  : /Linux/.test(ua)
                    ? 'Linux'
                    : null;
    return os ? `${browser} on ${os}` : browser;
}

/** the TV (or camera) showing this code, as someone typed it */
export function byCode(code: string, kind: Display['kind'] = 'tv') {
    const typed = code.replace(/\s+/g, '').toUpperCase();
    return [...displays.values()].find((d) => d.kind === kind && d.code === typed);
}

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
    kind: Display['kind'];
    id: unknown;
    secret: unknown;
    code: unknown;
    config: unknown;
    refreshToken: unknown;
    viewer?: unknown;
}): Display {
    const { id, secret } = input;
    if (!isToken(id) || !isToken(secret)) {
        throw new DisplayError('invalid display');
    }
    forgetIdle();
    const known = displays.get(id);
    if (known) {
        known.lastSeen = Date.now();
        if (!same(known.secret, secret) || known.kind !== input.kind) {
            throw new DisplayError('display id taken', 409);
        }
        known.code = codeFor(id, input.code);
        known.viewer = input.viewer === true;
        known.refreshToken ??= typeof input.refreshToken === 'string' ? input.refreshToken : null;
        return known;
    }
    const display: Display = {
        id,
        kind: input.kind,
        secret,
        code: codeFor(id, input.code),
        config: parseConfig(input.config),
        refreshToken: typeof input.refreshToken === 'string' ? input.refreshToken : null,
        listeners: new Set(),
        viewer: input.viewer === true,
        name: 'TV',
        lastSeen: Date.now(),
    };
    displays.set(id, display);
    return display;
}

/** the display, if `secret` is its secret: the TV itself */
export function authorize(id: unknown, secret: unknown) {
    const display = typeof id === 'string' ? displays.get(id) : undefined;
    if (!display || typeof secret !== 'string' || !same(display.secret, secret)) {
        throw new DisplayError('unknown display', 404);
    }
    display.lastSeen = Date.now();
    return display;
}

export function update(display: Display, patch: DisplayPatch & Partial<DisplayConfig>) {
    if (patch.groupId !== undefined && patch.groupId !== display.config.groupId)
        display.vision = undefined;
    display.config = { ...display.config, ...patch };
    emit(display, { type: 'config', config: display.config });
    if (display.kind === 'camera' && display.config.groupId) {
        for (const tv of byGroup(display.config.groupId, 'tv', { viewers: true })) {
            const corners = tv.config.cameraCorners.map((corner) =>
                corner.cameraId === display.id
                    ? { ...corner, subject: display.config.cameraSubject }
                    : corner
            );
            if (
                tv.config.cameraId === display.id ||
                corners.some((corner, i) => corner !== tv.config.cameraCorners[i])
            ) {
                // Remember subjects so a new device can replace this camera later.
                tv.config = {
                    ...tv.config,
                    cameraCorners: corners,
                    cameraSubject:
                        tv.config.cameraId === display.id
                            ? display.config.cameraSubject
                            : tv.config.cameraSubject,
                };
                emit(tv, { type: 'config', config: tv.config });
            }
            for (const [position, camera] of camerasFor(tv))
                if (camera === display) cameraConfig(display, tv, position);
        }
    }
}

export function setSession(display: Display, refreshToken: string) {
    display.refreshToken = refreshToken;
    emit(display, { type: 'session', refreshToken });
}

export function reload(display: Display) {
    emit(display, { type: 'reload' });
}

/** asks the camera for its video, for this TV */
export function watch(camera: Display, tv: Display, position: CameraPosition | 'main' = 'main') {
    cameraConfig(camera, tv, position);
    emit(camera, { type: 'watch', tvId: tv.id });
}

function cameraConfig(camera: Display, tv: Display, position: CameraPosition | 'main') {
    emit(tv, { position, type: 'cameraConfig', cameraId: camera.id, config: camera.config });
}

/**
 * Passes a signal on between a TV and the camera it shows; false if they don't belong together
 * (any longer).
 */
export function signal(from: Display, toId: unknown, value: Signal) {
    const to = typeof toId === 'string' ? displays.get(toId) : undefined;
    if (!to || to.kind === from.kind) return false;
    const [tv, camera] = from.kind === 'tv' ? [from, to] : [to, from];
    if (!camera.config.groupId || tv.config.groupId !== camera.config.groupId) return false;
    const position = [...camerasFor(tv)].find(([, selected]) => selected === camera)?.[0];
    if (!['auto', 'camera'].includes(tv.config.view) || !position) return false;
    if (value.type !== (from === camera ? 'offer' : 'answer')) return false;
    emit(to, { type: 'signal', position, from: from.id, signal: value });
    return true;
}

function emit(display: Display, event: DisplayEvent) {
    for (const listener of display.listeners) listener(event);
}

/** listens to a display's changes; returns the unsubscribe */
export function subscribe(display: Display, listener: (event: DisplayEvent) => void) {
    display.listeners.add(listener);
    return () => display.listeners.delete(listener);
}
