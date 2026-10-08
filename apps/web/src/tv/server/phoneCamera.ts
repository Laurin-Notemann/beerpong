import { randomBytes } from 'node:crypto';

import { putGroupOn, putGroupOnCamera } from '~/tv/server/appRemote';
import { type Display, DisplayError, update } from '~/tv/server/displays';

// A short-lived handoff grants only pairing: a phone's camera, or the live match screen's Camera
// tab watching one match. The phone's API token stays in the app.
const grants = new Map<
    string,
    {
        groupId: string;
        expires: number;
        kind: Display['kind'];
        matchId?: string;
        displayId?: string;
    }
>();

function grant(groupId: string, kind: Display['kind'], matchId?: string) {
    for (const [token, grant] of grants) if (grant.expires <= Date.now()) grants.delete(token);
    const token = randomBytes(24).toString('base64url');
    grants.set(token, { groupId, kind, matchId, expires: Date.now() + 5 * 60_000 });
    return token;
}

export const phoneCameraToken = (groupId: string) => grant(groupId, 'camera');

/** for a phone's TV page (`/tv?inApp=1`) showing the match's camera view */
export const phoneViewerToken = (groupId: string, matchId: string) => grant(groupId, 'tv', matchId);

export async function claimPhoneDisplay(token: string, display: Display) {
    const grant = grants.get(token);
    if (
        !grant ||
        grant.kind !== display.kind ||
        grant.expires <= Date.now() ||
        (grant.displayId && grant.displayId !== display.id)
    )
        throw new DisplayError(
            display.kind === 'camera'
                ? 'Phone camera link expired. Open it again from TV Remote.'
                : 'Camera link expired. Open the Camera tab again.'
        );
    // Reserve before the API call; a retry by this device can finish a failed join.
    grant.displayId = display.id;
    if (display.kind === 'camera') return putGroupOnCamera(display, grant.groupId);
    await putGroupOn(display, grant.groupId);
    update(display, {
        view: 'camera',
        focusMatchId: null,
        pinnedMatchIds: grant.matchId ? [grant.matchId] : [],
    });
}
