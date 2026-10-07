import { createFileRoute } from '@tanstack/react-router';

import { apiFor, ApiError } from '~/tv/server/api';
import { fail } from '~/tv/server/appRemote';
import { authorize, DisplayError } from '~/tv/server/displays';

/** Display-secret query reads persisted suggestions, including missed socket events. */
export const Route = createFileRoute('/tv/api/displays/$id/vision-hits')({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                try {
                    const query = new URL(request.url).searchParams;
                    const display = authorize(
                        params.id,
                        request.headers.get('X-Display-Key') ?? query.get('key')
                    );
                    if (!display.config.groupId || !display.refreshToken)
                        return fail(403, 'displayNotPaired');
                    const rows = await apiFor(display.refreshToken).visionHits(
                        display.config.groupId,
                        {
                            liveMatchId: query.get('liveMatchId') ?? undefined,
                            review: query.get('review') === 'true',
                            before: query.get('before') ?? undefined,
                            limit: Math.min(
                                200,
                                Math.max(1, Number(query.get('limit') ?? 50) || 50)
                            ),
                        }
                    );
                    return Response.json(rows, { headers: { 'Cache-Control': 'no-store' } });
                } catch (error) {
                    if (error instanceof DisplayError) return fail(error.status, error.message);
                    if (error instanceof ApiError) return fail(error.httpCode, error.code);
                    throw error;
                }
            },
        },
    },
});
