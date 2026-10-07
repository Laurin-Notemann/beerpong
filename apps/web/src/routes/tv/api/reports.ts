import { createFileRoute } from '@tanstack/react-router';

/**
 * Passes the TV's and the camera's Sentry reports on to the project `web` (tv/sentry.ts
 * `tunnel`): content blockers drop a browser's requests to Sentry itself, which lost every
 * report from the camera's laptop. Only envelopes for this build's DSN go through.
 */
export const Route = createFileRoute('/tv/api/reports')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const dsn = import.meta.env.VITE_SENTRY_DSN;
                if (!dsn) return new Response(null, { status: 404 });
                const body = new Uint8Array(await request.arrayBuffer());
                if (body.byteLength > 1_000_000) return new Response(null, { status: 413 });
                const newline = body.indexOf(10);
                const header = new TextDecoder().decode(
                    newline < 0 ? body : body.subarray(0, newline)
                );
                const project = new URL(dsn);
                try {
                    const target = new URL(JSON.parse(header).dsn);
                    if (target.host !== project.host || target.pathname !== project.pathname) {
                        return new Response(null, { status: 400 });
                    }
                } catch {
                    return new Response(null, { status: 400 });
                }
                const res = await fetch(
                    `https://${project.host}/api${project.pathname}/envelope/`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-sentry-envelope' },
                        body,
                    }
                );
                await res.body?.cancel();
                // the SDK backs off on these
                const headers = new Headers();
                for (const name of ['x-sentry-rate-limits', 'retry-after']) {
                    const value = res.headers.get(name);
                    if (value) headers.set(name, value);
                }
                return new Response(null, { status: res.status, headers });
            },
        },
    },
});
