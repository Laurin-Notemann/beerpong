import { createFileRoute } from '@tanstack/react-router';

import { asMember, fail, putGroupOn } from '~/tv/server/appRemote';
import { byCode, byGroup, type Display } from '~/tv/server/displays';
import { phoneViewerToken } from '~/tv/server/phoneCamera';

const asJson = (d: Display) => ({ id: d.id, name: d.name, config: d.config });

/**
 * The group's TVs, for the app's TV remote (see appRemote.ts): GET the ones that are on, POST
 * `{ code }` to put the group on the TV that shows that code, or `{ viewer: true, matchId }` for
 * the pairing token of the live match screen's Camera tab (phoneCamera.ts).
 */
export const Route = createFileRoute('/tv/api/groups/$groupId/displays')({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                asMember(request, params.groupId, () =>
                    Response.json(byGroup(params.groupId).map(asJson))
                ),
            POST: ({ request, params }) =>
                asMember(request, params.groupId, async () => {
                    const body: unknown = await request.json().catch(() => null);
                    if (
                        body &&
                        typeof body === 'object' &&
                        'viewer' in body &&
                        body.viewer === true &&
                        'matchId' in body &&
                        typeof body.matchId === 'string'
                    )
                        return Response.json({
                            pairingToken: phoneViewerToken(params.groupId, body.matchId),
                        });
                    const code =
                        body &&
                        typeof body === 'object' &&
                        'code' in body &&
                        typeof body.code === 'string'
                            ? body.code
                            : '';
                    const display = byCode(code);
                    if (!display) return fail(404, 'tvCodeNotFound');
                    await putGroupOn(display, params.groupId);
                    return Response.json(asJson(display));
                }),
        },
    },
});
