import { createFileRoute } from '@tanstack/react-router';

import { asMember, fail } from '~/tv/server/appRemote';
import { byGroup, reload } from '~/tv/server/displays';

/** the app's TV remote reloading the TV's page, e.g. to pick up a deploy */
export const Route = createFileRoute('/tv/api/groups/$groupId/displays/$id/reload')({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                asMember(request, params.groupId, () => {
                    const display = byGroup(params.groupId).find((d) => d.id === params.id);
                    if (!display) return fail(404, 'tvNotFound');
                    reload(display);
                    return new Response(null, { status: 204 });
                }),
        },
    },
});
