import { createFileRoute } from '@tanstack/react-router';

import { parsePatch } from '@/lib/tvDisplay';
import { asMember, fail, removeGroup } from '~/tv/server/appRemote';
import { byGroup, update } from '~/tv/server/displays';

/**
 * One of the group's TVs, for the app's TV remote: PATCH changes what it shows (a
 * `DisplayPatch`), DELETE takes the group off it.
 */
export const Route = createFileRoute('/tv/api/groups/$groupId/displays/$id')({
    server: {
        handlers: {
            PATCH: ({ request, params }) =>
                asMember(request, params.groupId, async () => {
                    const display = byGroup(params.groupId).find((d) => d.id === params.id);
                    if (!display) return fail(404, 'tvNotFound');
                    update(display, parsePatch(await request.json().catch(() => null)));
                    return Response.json({ id: display.id, config: display.config });
                }),
            DELETE: ({ request, params }) =>
                asMember(request, params.groupId, async () => {
                    const display = byGroup(params.groupId).find((d) => d.id === params.id);
                    if (!display) return fail(404, 'tvNotFound');
                    await removeGroup(display);
                    return new Response(null, { status: 204 });
                }),
        },
    },
});
