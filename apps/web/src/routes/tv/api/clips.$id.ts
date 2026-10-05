import { createFileRoute } from '@tanstack/react-router';

import { clipResponse } from '~/tv/server/clips';

/** a player's score clip, for the TV (see clips.ts) */
export const Route = createFileRoute('/tv/api/clips/$id')({
    server: {
        handlers: {
            GET: ({ request, params }) => clipResponse(params.id, request.headers.get('Range')),
        },
    },
});
