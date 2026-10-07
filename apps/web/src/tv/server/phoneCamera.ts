import { randomBytes } from 'node:crypto';

import { putGroupOnCamera } from '~/tv/server/appRemote';
import { type Display, DisplayError } from '~/tv/server/displays';

// A short-lived handoff grants only camera pairing. The phone's API token stays in the app.
const grants = new Map<string, { groupId: string; expires: number; cameraId?: string }>();

export function phoneCameraToken(groupId: string) {
    for (const [token, grant] of grants) if (grant.expires <= Date.now()) grants.delete(token);
    const token = randomBytes(24).toString('base64url');
    grants.set(token, { groupId, expires: Date.now() + 5 * 60_000 });
    return token;
}

export async function claimPhoneCamera(token: string, camera: Display) {
    const grant = grants.get(token);
    if (!grant || grant.expires <= Date.now() || (grant.cameraId && grant.cameraId !== camera.id))
        throw new DisplayError('Phone camera link expired. Open it again from TV Remote.');
    // Reserve before the API call; a retry by this device can finish a failed join.
    grant.cameraId = camera.id;
    await putGroupOnCamera(camera, grant.groupId);
}
