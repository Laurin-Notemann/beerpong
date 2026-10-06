import { createServerFn } from '@tanstack/react-start';

import { socketUrl } from '~/apiUrl';
import { buildBoard } from '~/tv/server/board';
import { authorize, register } from '~/tv/server/displays';

// What the TV's page calls. Phones change it through the app (appRemote.ts).

const asObject = (data: unknown) =>
    (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

/** a TV announcing itself, on load and whenever its connection comes back */
export const registerDisplay = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const display = register({
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
