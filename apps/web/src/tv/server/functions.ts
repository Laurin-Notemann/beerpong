import { createServerFn } from '@tanstack/react-start';

import { emptyConfig, parsePatch } from '@/lib/tvDisplay';
import { socketUrl } from '~/apiUrl';
import { apiFor, ApiError, signup } from '~/tv/server/api';
import { removeGroup } from '~/tv/server/appRemote';
import { buildBoard } from '~/tv/server/board';
import { authorize, register, reload, setSession, update } from '~/tv/server/displays';

const asObject = (data: unknown) =>
    (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

/** a TV announcing itself, on load and whenever its connection comes back */
export const registerDisplay = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const display = register({
            id: data.id,
            key: data.key,
            secret: data.secret,
            code: data.code,
            config: data.config,
            refreshToken: data.refreshToken,
        });
        return { config: display.config, code: display.code };
    });

/** a phone changing what the TV shows */
export const updateDisplay = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const { display } = authorize(data.id, data.key);
        update(display, parsePatch(data.patch));
        return { config: display.config };
    });

/** a phone putting a group on the TV with the group's invite code; the TV joins it */
export const connectGroup = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const { display } = authorize(data.id, data.key);
        // the app shows the code in groups ("123 456 789")
        const code = typeof data.inviteCode === 'string' ? data.inviteCode.replace(/\s+/g, '') : '';
        if (!code) return { error: 'Enter the group code.' };

        if (!display.refreshToken) setSession(display, await signup(display.id));
        const api = apiFor(display.refreshToken!);

        let group;
        try {
            group = await api.groupByInviteCode(code);
        } catch (err) {
            if (err instanceof ApiError && err.code.startsWith('group')) {
                return { error: 'No group has this code.' };
            }
            throw err;
        }
        const previous = display.config.groupId;
        await api.join(group.id!);
        if (previous && previous !== group.id) await api.leave(previous).catch(() => {});

        update(display, { ...emptyConfig, groupId: group.id!, groupName: group.name ?? '' });
        return { config: display.config };
    });

/** a phone reloading the TV's page, e.g. to pick up a deploy */
export const reloadDisplay = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        reload(authorize(data.id, data.key).display);
    });

/** a phone taking the group off the TV */
export const disconnectGroup = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const { display } = authorize(data.id, data.key);
        await removeGroup(display);
        return { config: display.config };
    });

/** what the TV shows right now, for the TV and for the phones controlling it */
export const getBoard = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const { display } = authorize(data.id, data.key);
        if (!display.config.groupId || !display.refreshToken) return null;
        return buildBoard(display.refreshToken, display.config);
    });

/** the API's websocket, as browsers reach it */
export const getSocketUrl = createServerFn({ method: 'GET' }).handler(() => socketUrl());
