import { useEffect, useRef, useState } from 'react';

import type { LiveMatchOpDto } from '@/openapi/openapi';

import type { LiveMatchView } from '~/tv/server/board';

/** a player's score clip, waiting to play on the TV */
export interface ScoreClip {
    /** the op that scored */
    id: string;
    url: string;
    name: string;
    team: 'blue' | 'red';
}

/**
 * The clips a socket event (apps/api/README-Socket-Updates.md) has the TV play: one for every
 * cup hit and every move that adds points in a live match on the board, by a player with a clip.
 */
export function scoreClipsOf(event: unknown, matches: LiveMatchView[]): ScoreClip[] {
    const e = event as {
        eventType?: string;
        scope?: string;
        body?: { liveMatchId?: string; ops?: LiveMatchOpDto[] };
    } | null;
    if (e?.eventType !== 'LIVE_MATCHES' || e.scope !== 'liveMatchOps') return [];
    const match = matches.find((i) => i.id === e.body?.liveMatchId);
    if (!match) return [];

    return (e.body?.ops ?? []).flatMap((op) => {
        const scored =
            op.type === 'RECORD_CUP_HIT' || (op.type === 'ADJUST_MOVE' && (op.delta ?? 0) > 0);
        if (!scored) return [];
        for (const team of ['blue', 'red'] as const) {
            const player = match[team].players.find((p) => p.id === op.playerId);
            if (player?.scoreClipUrl) {
                return [{ id: op.id ?? '', url: player.scoreClipUrl, name: player.name, team }];
            }
        }
        return [];
    });
}

/**
 * Every clip the live matches' players (and the queue) need, downloaded once when it first shows
 * up (a match starting, or a player uploading a new clip, which gets a new URL) and kept in
 * memory until nothing needs it anymore, so a score plays its clip without waiting on the
 * network. Gives the local copy of a clip, or its URL to stream while that's still loading.
 */
export function useClipCache(matches: LiveMatchView[], queue: ScoreClip[]) {
    const urls = [
        ...matches.flatMap((i) => [...i.blue.players, ...i.red.players].map((p) => p.scoreClipUrl)),
        ...queue.map((i) => i.url),
    ].filter((i): i is string => !!i);
    const key = [...new Set(urls)].sort().join(' ');

    /** object URLs by clip URL, null while downloading */
    const cache = useRef(new Map<string, string | null>());
    const [, setLoaded] = useState(0);
    useEffect(() => {
        const wanted = new Set(key.split(' ').filter(Boolean));
        for (const [url, local] of cache.current) {
            if (wanted.has(url)) continue;
            if (local) URL.revokeObjectURL(local);
            cache.current.delete(url);
        }
        for (const url of wanted) {
            if (cache.current.has(url)) continue;
            cache.current.set(url, null);
            fetch(url)
                .then((res) => {
                    if (!res.ok) throw new Error(`score clip: HTTP ${res.status}`);
                    return res.blob();
                })
                .then((blob) => {
                    if (cache.current.get(url) !== null) return; // not needed anymore
                    cache.current.set(url, URL.createObjectURL(blob));
                    setLoaded((n) => n + 1);
                })
                // streamed for now; downloaded again when the matches change
                .catch(() => cache.current.delete(url));
        }
    }, [key]);

    return (url: string) => cache.current.get(url) ?? url;
}
