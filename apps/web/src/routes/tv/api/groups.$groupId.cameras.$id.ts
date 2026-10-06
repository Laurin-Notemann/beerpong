import { createFileRoute } from '@tanstack/react-router';

import { emptyConfig } from '@/lib/tvDisplay';
import { asMember, fail } from '~/tv/server/appRemote';
import { byGroup, update } from '~/tv/server/displays';

/** one of the group's cameras, for the app's TV remote: DELETE takes the group off it */
export const Route = createFileRoute('/tv/api/groups/$groupId/cameras/$id')({
    server: {
        handlers: {
            DELETE: ({ request, params }) =>
                asMember(request, params.groupId, () => {
                    const camera = byGroup(params.groupId, 'camera').find(
                        (d) => d.id === params.id
                    );
                    if (!camera) return fail(404, 'cameraNotFound');
                    // it shows its code again; the TVs it filmed for lose its video
                    update(camera, emptyConfig);
                    return new Response(null, { status: 204 });
                }),
        },
    },
});
