import { createFileRoute } from '@tanstack/react-router';

import { asMember, fail } from '~/tv/server/appRemote';
import { requestVision } from '~/tv/server/cameraVision';
import { byGroup, DisplayError } from '~/tv/server/displays';

export const Route = createFileRoute('/tv/api/groups/$groupId/cameras/$id/vision')({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                asMember(request, params.groupId, () => {
                    const camera = byGroup(params.groupId, 'camera').find(
                        (c) => c.id === params.id
                    );
                    if (!camera) return fail(404, 'cameraNotFound');
                    return Response.json(camera.vision ?? null, {
                        headers: { 'Cache-Control': 'no-store' },
                    });
                }),
            PATCH: ({ request, params }) =>
                asMember(request, params.groupId, async () => {
                    const camera = byGroup(params.groupId, 'camera').find(
                        (c) => c.id === params.id
                    );
                    if (!camera) return fail(404, 'cameraNotFound');
                    try {
                        const command = requestVision(
                            camera,
                            await request.json().catch(() => null)
                        );
                        return Response.json(
                            { command },
                            { status: 202, headers: { 'Cache-Control': 'no-store' } }
                        );
                    } catch (error) {
                        if (error instanceof DisplayError) return fail(error.status, error.message);
                        throw error;
                    }
                }),
        },
    },
});
