import { createFileRoute } from '@tanstack/react-router';

import { asMember } from '~/tv/server/appRemote';
import { byGroup } from '~/tv/server/displays';

/** the TVs that are on and show the group, for the app's TV remote (see appRemote.ts) */
export const Route = createFileRoute('/tv/api/groups/$groupId/displays')({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                asMember(request, params.groupId, () =>
                    Response.json(
                        byGroup(params.groupId).map((d) => ({
                            id: d.id,
                            name: d.name,
                            config: d.config,
                        }))
                    )
                ),
        },
    },
});
