import { createFileRoute } from '@tanstack/react-router';

import { asMember, fail, putGroupOnCamera } from '~/tv/server/appRemote';
import { byCode, byGroup, type Display } from '~/tv/server/displays';

const asJson = (d: Display) => ({ id: d.id, name: d.name });

/**
 * The group's cameras, for the app's TV remote (see appRemote.ts): GET the ones that are on,
 * POST `{ code }` to put the group on the camera that shows that code.
 */
export const Route = createFileRoute('/tv/api/groups/$groupId/cameras')({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                asMember(request, params.groupId, () =>
                    Response.json(byGroup(params.groupId, 'camera').map(asJson))
                ),
            POST: ({ request, params }) =>
                asMember(request, params.groupId, async (token) => {
                    const body = await request.json().catch(() => null);
                    const code = typeof body?.code === 'string' ? body.code : '';
                    const camera = byCode(code, 'camera');
                    if (!camera) return fail(404, 'cameraCodeNotFound');
                    await putGroupOnCamera(camera, params.groupId, token);
                    return Response.json(asJson(camera));
                }),
        },
    },
});
