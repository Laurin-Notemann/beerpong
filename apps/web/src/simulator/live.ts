import { useEffect, useRef, useState } from 'react';

// Events of the API's websocket that change what the page shows.
const relevant = new Set([
    'MATCHES',
    'PLAYERS',
    'SEASONS',
    'GROUPS',
    'RULE_MOVES',
    'PROFILES',
    'LIVE_MATCHES',
]);

export type LiveStatus = 'connecting' | 'live' | 'offline';

// useLive subscribes to the group on the API's websocket and calls onChange
// when its data changes, and after a reconnect to catch up on what it missed.
export function useLive(url: string, groupId: string, onChange: () => void) {
    const [status, setStatus] = useState<LiveStatus>('connecting');
    const changed = useRef(onChange);
    useEffect(() => {
        changed.current = onChange;
    });
    useEffect(() => {
        let ws: WebSocket | undefined;
        let retry: ReturnType<typeof setTimeout> | undefined;
        let debounce: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;
        let wasOpen = false;
        // one match sends several events; refetch once
        const refetch = () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => changed.current(), 300);
        };
        const connect = () => {
            setStatus('connecting');
            ws = new WebSocket(url);
            ws.onopen = () => {
                ws?.send(JSON.stringify({ groupIds: [groupId] }));
                setStatus('live');
                if (wasOpen) refetch();
                wasOpen = true;
            };
            ws.onmessage = (e) => {
                const event = JSON.parse(String(e.data)) as {
                    groupId?: string;
                    eventType?: string;
                };
                if (event.groupId === groupId && relevant.has(event.eventType ?? '')) refetch();
            };
            ws.onclose = () => {
                if (stopped) return;
                setStatus('offline');
                retry = setTimeout(connect, 3000);
            };
        };
        connect();
        return () => {
            stopped = true;
            clearTimeout(retry);
            clearTimeout(debounce);
            ws?.close();
        };
    }, [url, groupId]);
    return status;
}
