import { createFileRoute } from '@tanstack/react-router';

import {
    authorize,
    camerasFor,
    deviceName,
    type DisplayEvent,
    DisplayError,
    subscribe,
} from '~/tv/server/displays';

/**
 * A TV's changes as server-sent events; the first event is the current config. `key` is the
 * TV's secret (named from when phones had keys, so TV pages from before keep working). The
 * app's remote lists a TV while this is open.
 */
export const Route = createFileRoute('/tv/api/displays/$id/events')({
    server: {
        handlers: {
            GET: ({ request, params }) => {
                let display;
                try {
                    display = authorize(params.id, new URL(request.url).searchParams.get('key'));
                } catch (err) {
                    if (err instanceof DisplayError) return new Response(null, { status: 404 });
                    throw err;
                }
                // what the app's remote calls it
                display.name = deviceName(request.headers.get('user-agent'));

                const encoder = new TextEncoder();
                let cleanup = () => {};
                const stream = new ReadableStream({
                    start(controller) {
                        const send = (event: DisplayEvent) => {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                            );
                        };
                        // Old pages can drop new config values or call server functions removed by
                        // a deploy. Their next SSE reconnect upgrades the page, keeping localStorage.
                        const version = import.meta.env.VITE_GIT_COMMIT;
                        if (
                            version &&
                            new URL(request.url).searchParams.get('version') !== version
                        ) {
                            send({ type: 'reload' });
                            controller.close();
                            return;
                        }
                        // A session may have been created before this stream connected.
                        if (display.refreshToken)
                            send({ type: 'session', refreshToken: display.refreshToken });
                        send({ type: 'config', config: display.config });
                        // Catch up on camera settings changed while this event stream was down.
                        if (display.kind === 'tv')
                            for (const [position, camera] of camerasFor(display))
                                send({
                                    type: 'cameraConfig',
                                    position,
                                    cameraId: camera.id,
                                    config: camera.config,
                                });
                        const unsubscribe = subscribe(display, send);
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
