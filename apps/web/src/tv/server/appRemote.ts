import { emptyConfig } from '@/lib/tvDisplay';
import { apiFor, ApiError, signup, userGroupIds } from '~/tv/server/api';
import { type Display, setSession, update } from '~/tv/server/displays';

/**
 * The app's TV remote (Settings → TV Remote, routes/tv/api/groups.*) puts the user's group on a
 * TV with the code the TV shows, and controls the TVs that show the group. The phone sends its
 * own API access token: anyone in the group may control its TVs.
 */

// a phone's token -> its user's groups, so a remote's polling doesn't ask the API every time
const memberships = new Map<string, { groupIds: string[]; expiresAt: number }>();

async function groupIdsOf(accessToken: string) {
    const now = Date.now();
    const cached = memberships.get(accessToken);
    if (cached && cached.expiresAt > now) return cached.groupIds;

    for (const [token, m] of memberships) if (m.expiresAt <= now) memberships.delete(token);
    const groupIds = await userGroupIds(accessToken);
    memberships.set(accessToken, { groupIds, expiresAt: now + 30_000 });
    return groupIds;
}

/** an error the app reads like the API's (`ResponseEnvelope.error.code`) */
export const fail = (status: number, code: string) =>
    Response.json({ error: { code } }, { status });

/**
 * `handle()`'s answer if the request's user is in the group. A rejected token gets a 401 without
 * a code, so the app gets a new one and tries again, as it does with the API.
 */
export async function asMember(
    request: Request,
    groupId: string,
    handle: () => Response | Promise<Response>
) {
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return new Response(null, { status: 401 });
    let groupIds;
    try {
        groupIds = await groupIdsOf(token);
    } catch (err) {
        if (err instanceof ApiError && err.httpCode === 401) {
            return new Response(null, { status: 401 });
        }
        throw err;
    }
    if (!groupIds.includes(groupId)) return fail(403, 'authUserNotInGroup');
    return handle();
}

/**
 * Puts the group on the TV: the TV's own API user joins it (a member without a profile, so it
 * doesn't show up in the group) and leaves the group it showed before.
 */
export async function putGroupOn(display: Display, groupId: string) {
    if (display.config.groupId === groupId) return;
    if (!display.refreshToken) setSession(display, await signup(display.id));
    const api = apiFor(display.refreshToken!);
    await api.join(groupId);
    const group = await api.group(groupId);
    const previous = display.config.groupId;
    if (previous && previous !== groupId) await api.leave(previous).catch(() => {});
    update(display, { ...emptyConfig, groupId, groupName: group.name ?? '' });
}

/** takes the group off the TV; the TV leaves it, so it no longer counts as a member */
export async function removeGroup(display: Display) {
    const groupId = display.config.groupId;
    if (groupId && display.refreshToken) {
        await apiFor(display.refreshToken)
            .leave(groupId)
            .catch(() => {});
    }
    update(display, emptyConfig);
}
