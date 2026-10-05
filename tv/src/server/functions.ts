import { createServerFn } from '@tanstack/react-start';

import { emptyConfig, parsePatch } from '~/lib/display';
import { apiFor, ApiError, apiUrl, signup } from '~/server/api';
import { buildBoard } from '~/server/board';
import { authorize, register, setSession, update } from '~/server/displays';

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
            config: data.config,
            refreshToken: data.refreshToken,
        });
        return { config: display.config };
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

/** takes the group off the TV; the TV leaves it, so it no longer counts as a member */
export const disconnectGroup = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const { display } = authorize(data.id, data.key);
        const groupId = display.config.groupId;
        if (groupId && display.refreshToken) {
            await apiFor(display.refreshToken)
                .leave(groupId)
                .catch(() => {});
        }
        update(display, emptyConfig);
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
export const getSocketUrl = createServerFn({ method: 'GET' }).handler(() => {
    const base = (process.env.VERSUS_API_PUBLIC_URL ?? apiUrl()).replace(/\/$/, '');
    return base.replace(/^http/, 'ws') + '/update-socket';
});
