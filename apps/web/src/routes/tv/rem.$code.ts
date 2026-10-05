import { createFileRoute } from '@tanstack/react-router';

import { byCode } from '~/tv/server/displays';

/**
 * The TV's QR code: a short link to its remote, so the code has fewer, larger modules. Right
 * after a restart of this server the TV hasn't registered again yet, so the page retries.
 */
export const Route = createFileRoute('/tv/rem/$code')({
    server: {
        handlers: {
            GET: ({ params }) => {
                const display = byCode(params.code);
                if (display) {
                    const remote = `/tv/remote/${display.id}?k=${encodeURIComponent(display.key)}`;
                    return new Response(null, { status: 302, headers: { Location: remote } });
                }
                return new Response(
                    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="3"><title>Versus TV</title><p style="font-family: system-ui; padding: 1rem">Looking for the TV… Make sure it is on.</p>',
                    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                );
            },
        },
    },
});
