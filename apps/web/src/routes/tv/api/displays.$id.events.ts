import { createFileRoute } from '@tanstack/react-router';

import { authorize, type DisplayEvent, DisplayError, subscribe } from '~/tv/server/displays';

/**
 * A display's changes as server-sent events, for the TV and the phones controlling it. The
 * first event is the current config. Only the TV (with its secret) gets its API session.
 */
export const Route = createFileRoute('/tv/api/displays/$id/events')({
    server: {
        handlers: {
            GET: ({ request, params }) => {
                let auth;
                try {
                    auth = authorize(params.id, new URL(request.url).searchParams.get('key'));
                } catch (err) {
                    if (err instanceof DisplayError) return new Response(null, { status: 404 });
                    throw err;
                }
                const { display, isTv } = auth;

                const encoder = new TextEncoder();
                let cleanup = () => {};
                const stream = new ReadableStream({
                    start(controller) {
                        const send = (event: DisplayEvent) => {
                            if (event.type !== 'config' && !isTv) return;
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                            );
                        };
                        send({ type: 'config', config: display.config });
                        const unsubscribe = subscribe(display, send, isTv);
                        // proxies close connections that stay quiet
                        const ping = setInterval(
                            () => controller.enqueue(encoder.encode(': ping\n\n')),
                            20_000
                        );
                        cleanup = () => {
                            unsubscribe();
                            clearInterval(ping);
                        };
                        request.signal.addEventListener('abort', () => {
                            cleanup();
                            try {
                                controller.close();
                            } catch {
                                // already closed
                            }
                        });
                    },
                    cancel: () => cleanup(),
                });
                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                    },
                });
            },
        },
    },
});
