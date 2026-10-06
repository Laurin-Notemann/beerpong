import { createServerFn } from '@tanstack/react-start';

import { socketUrl } from '~/apiUrl';
import { buildBoard } from '~/tv/server/board';
import { authorize, cameraFor, register, signal, watch } from '~/tv/server/displays';

// What the TV's and the camera's pages call. Phones change them through the app (appRemote.ts).

const asObject = (data: unknown) =>
    (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

/** a TV or camera announcing itself, on load and whenever its connection comes back */
export const registerDisplay = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const display = register({
            // TV pages from before cameras don't send it
            kind: data.kind === 'camera' ? 'camera' : 'tv',
            id: data.id,
            secret: data.secret,
            code: data.code,
            config: data.config,
            refreshToken: data.refreshToken,
        });
        return { config: display.config, code: display.code };
    });

/**
 * what the TV shows right now; `key` is the TV's secret (named from when phones had keys, so
 * TV pages from before keep working)
 */
export const getBoard = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const display = authorize(data.id, data.key);
        if (!display.config.groupId || !display.refreshToken) return null;
        return buildBoard(display.refreshToken, display.config);
    });

/** the API's websocket, as browsers reach it */
export const getSocketUrl = createServerFn({ method: 'GET' }).handler(() => socketUrl());

/**
 * The TV asking its camera (`cameraFor`) for the video; the camera answers with an offer on the
 * TV's events. Null while the group has no camera on.
 */
export const watchCamera = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const tv = authorize(data.id, data.key);
        const camera = tv.kind === 'tv' && tv.config.view === 'camera' ? cameraFor(tv) : undefined;
        if (!camera) return null;
        watch(camera, tv);
        return camera.id;
    });

/** an offer or answer from a TV or camera (`id`, `key`) to the other end (`to`) */
export const sendSignal = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const from = authorize(data.id, data.key);
        const value = asObject(data.signal);
        const type = value.type;
        const sdp = value.sdp;
        if ((type !== 'offer' && type !== 'answer') || typeof sdp !== 'string') return false;
        if (sdp.length > 100_000) return false;
        return signal(from, data.to, { type, sdp });
    });
