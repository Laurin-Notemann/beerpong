import { createFileRoute } from '@tanstack/react-router';

import { parsePatch } from '@/lib/tvDisplay';
import { asMember, fail, removeGroup } from '~/tv/server/appRemote';
import { byGroup, update } from '~/tv/server/displays';

/** PATCH labels or flips a camera; DELETE takes the group off it. */
export const Route = createFileRoute('/tv/api/groups/$groupId/cameras/$id')({
    server: {
        handlers: {
            PATCH: ({ request, params }) =>
                asMember(request, params.groupId, async () => {
                    const camera = byGroup(params.groupId, 'camera').find(
                        (d) => d.id === params.id
                    );
                    if (!camera) return fail(404, 'cameraNotFound');
                    const {
                        cameraSubject,
                        cameraVideoFlipped,
                        cameraVideoFlippedVertically,
                        cameraRotation,
                    } = parsePatch(await request.json().catch(() => null));
                    update(camera, {
                        ...(cameraRotation !== undefined ? { cameraRotation } : {}),
                        ...(cameraSubject !== undefined ? { cameraSubject } : {}),
                        ...(cameraVideoFlipped !== undefined ? { cameraVideoFlipped } : {}),
                        ...(cameraVideoFlippedVertically !== undefined
                            ? { cameraVideoFlippedVertically }
                            : {}),
                    });
                    return Response.json({
                        id: camera.id,
                        name: camera.name,
                        config: camera.config,
                    });
                }),
            DELETE: ({ request, params }) =>
                asMember(request, params.groupId, async () => {
                    const camera = byGroup(params.groupId, 'camera').find(
                        (d) => d.id === params.id
                    );
                    if (!camera) return fail(404, 'cameraNotFound');
                    // it shows its code again; the TVs it filmed for lose its video
                    await removeGroup(camera);
                    return new Response(null, { status: 204 });
                }),
        },
    },
});
