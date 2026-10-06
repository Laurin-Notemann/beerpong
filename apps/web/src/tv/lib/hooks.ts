import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { DisplayConfig } from '@/lib/tvDisplay';
import { getBoard, getSocketUrl } from '~/tv/server/functions';

export type DisplayEvent =
    | { type: 'config'; config: DisplayConfig }
    | { type: 'session'; refreshToken: string }
    | { type: 'reload' };

/**
 * Follows the TV's server-sent events. When the stream fails for good (the server restarted
 * and forgot the TV, or it's unreachable), `onLost` runs and the stream opens again after it:
 * the TV registers itself again there. `secret` goes as `key` (see the events route).
 */
export function useDisplayEvents(
    id: string | undefined,
    secret: string | undefined,
    onEvent: (event: DisplayEvent) => void,
    onLost: () => Promise<unknown> | void
) {
    const [connected, setConnected] = useState(false);
    const handlers = useRef({ onEvent, onLost });
    handlers.current = { onEvent, onLost };

    useEffect(() => {
        if (!id || !secret) return;
        let source: EventSource | undefined;
        let retry: ReturnType<typeof setTimeout> | undefined;
        let closed = false;

        const open = () => {
            source = new EventSource(
                `/tv/api/displays/${id}/events?key=${encodeURIComponent(secret)}`
            );
            source.onopen = () => setConnected(true);
            source.onmessage = (e) => handlers.current.onEvent(JSON.parse(e.data));
            source.onerror = () => {
                setConnected(false);
                // EventSource retries by itself unless the server answered with an error
                if (source?.readyState !== EventSource.CLOSED) return;
                retry = setTimeout(async () => {
                    await Promise.resolve(handlers.current.onLost()).catch(() => {});
                    if (!closed) open();
                }, 2_000);
            };
        };
        open();
        return () => {
            closed = true;
            clearTimeout(retry);
            source?.close();
        };
    }, [id, secret]);

    return connected;
}

/**
 * what the TV shows, refetched when its config changes and when the group changes;
 * `onSocketEvent` gets each of the group's socket events as it arrives
 */
export function useBoard(
    id: string | undefined,
    secret: string | undefined,
    config: DisplayConfig | undefined,
    onSocketEvent?: (event: unknown) => void
) {
    const queryClient = useQueryClient();
    const groupId = config?.groupId;

    useGroupSocket(
        groupId,
        () => queryClient.invalidateQueries({ queryKey: ['board'] }),
        onSocketEvent
    );

    return useQuery({
        queryKey: ['board', id, config?.groupId, config?.scope, config?.seasonId],
        queryFn: () => getBoard({ data: { id, key: secret } }),
        enabled: !!id && !!secret && !!groupId,
        // the socket brings changes; this is the safety net if it misses some
        refetchInterval: 60_000,
        placeholderData: (previous) => previous,
    });
}

/**
 * Subscribes to the group on the API's websocket (apps/api/README-Socket-Updates.md) and calls
 * `onChange` for every event, debounced: a match entry sends several at once. Reconnects with
 * a backoff and counts a reconnect as a change, since events may have been missed meanwhile.
 * `onEvent` gets every event itself, right away.
 */
function useGroupSocket(
    groupId: string | null | undefined,
    onChange: () => void,
    onEvent?: (event: unknown) => void
) {
    const callback = useRef(onChange);
    callback.current = onChange;
    const eventCallback = useRef(onEvent);
    eventCallback.current = onEvent;

    useEffect(() => {
        if (!groupId) return;
        let socket: WebSocket | undefined;
        let retry: ReturnType<typeof setTimeout> | undefined;
        let debounce: ReturnType<typeof setTimeout> | undefined;
        let attempt = 0;
        let closed = false;

        const changed = () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => callback.current(), 250);
        };

        const connect = async () => {
            const url = await getSocketUrl();
            if (closed) return;
            socket = new WebSocket(url);
            socket.onopen = () => {
                socket!.send(JSON.stringify({ groupIds: [groupId] }));
                if (attempt > 0) changed();
                attempt = 0;
            };
            socket.onmessage = (e) => {
                changed();
                try {
                    eventCallback.current?.(JSON.parse(e.data));
                } catch {
                    // not JSON: only a change
                }
            };
            socket.onclose = () => {
                if (closed) return;
                attempt++;
                retry = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** attempt));
            };
        };
        connect().catch(() => {
            attempt++;
            retry = setTimeout(connect, 5_000);
        });

        return () => {
            closed = true;
            clearTimeout(retry);
            clearTimeout(debounce);
            socket?.close();
        };
    }, [groupId]);
}

/** the current time, updated every `ms` */
export function useNow(ms = 1_000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(timer);
    }, [ms]);
    return now;
}

/** a random URL-safe token, for display ids and secrets */
export function randomToken(bytes = 18) {
    const data = crypto.getRandomValues(new Uint8Array(bytes));
    return btoa(String.fromCharCode(...data))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
