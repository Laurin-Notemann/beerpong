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
 * cup hit and every move that adds points in a live match on the board, by a player with a clip
 * (one of theirs at random).
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
            const clips = player?.scoreClipUrls ?? [];
            if (player && clips.length) {
                // one of their clips at random, a new one every score
                const url = clips[Math.floor(Math.random() * clips.length)];
                return [{ id: op.id ?? '', url, name: player.name, team }];
            }
        }
        return [];
    });
}

/** the clip's first or last frame (server/clips.ts), over the video while it starts and stops */
export const frameOf = (url: string, frame: 'first' | 'last') => `${url}?frame=${frame}`;

interface PreloadedClip {
    controller: AbortController;
    source?: string;
    size: number;
    loading: boolean;
    retryAt: number;
}

const preloaded = new Map<string, PreloadedClip>();
/** Compressed video bytes only: no hidden players competing for the TV's one decoder. */
const MAX_BYTES = 128 * 1024 * 1024;
const MAX_CLIP_BYTES = 16 * 1024 * 1024;
let loading = 0;

/** A ready local clip on desktop browsers, otherwise the same streaming URL as before. */
export const preloadedClipSource = (url: string) => preloaded.get(url)?.source ?? url;

/**
 * Downloads every live player's clips as soon as the board learns about their match. Desktop
 * browsers play the retained blobs; Tizen keeps streaming from the server (WEB-4), which already
 * converts all these clips while building the board. Frames cover its separate video layer.
 * Pass an empty list when the board unmounts to release its blobs and cancel pending downloads.
 */
export function preloadClips(matches: LiveMatchView[]) {
    const urls = new Set(
        matches.flatMap((m) =>
            [...m.blue.players, ...m.red.players].flatMap((p) => p.scoreClipUrls ?? [])
        )
    );
    for (const [url, clip] of preloaded) {
        if (urls.has(url)) continue;
        clip.controller.abort();
        if (clip.source) URL.revokeObjectURL(clip.source);
        preloaded.delete(url);
    }
    for (const url of urls) {
        if (preloaded.has(url)) continue;
        preloaded.set(url, {
            controller: new AbortController(),
            size: 0,
            loading: false,
            retryAt: 0,
        });
        new Image().src = frameOf(url, 'first');
        new Image().src = frameOf(url, 'last');
    }
    // Samsung's native player cannot read page-owned blobs. Preserve its proven URL path.
    if (!/Tizen|SmartTV|SMART-TV/i.test(navigator.userAgent)) loadNext();
}

function loadNext() {
    for (const [url, clip] of preloaded) {
        if (loading >= 2) break;
        if (clip.loading || clip.source || clip.retryAt > Date.now()) continue;
        clip.loading = true;
        clip.controller = new AbortController();
        loading++;
        void downloadClip(url, clip).finally(() => {
            loading--;
            clip.loading = false;
            loadNext();
        });
    }
}

async function downloadClip(url: string, clip: PreloadedClip) {
    const timeout = setTimeout(() => clip.controller.abort(), 60_000);
    try {
        const res = await fetch(url, { signal: clip.controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Read with a limit even when Content-Length is missing (e.g. conversion fell back to
        // the original upload). Two downloads at a time keep transient memory bounded too.
        const reader = res.body!.getReader();
        const parts: Uint8Array<ArrayBuffer>[] = [];
        let size = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_CLIP_BYTES) {
                await reader.cancel();
                throw new Error('clip exceeds preload size limit');
            }
            parts.push(value);
        }
        if (preloaded.get(url) !== clip || clip.controller.signal.aborted) return;
        const retained = [...preloaded.values()].reduce((sum, i) => sum + i.size, 0);
        if (retained + size <= MAX_BYTES) {
            clip.source = URL.createObjectURL(new Blob(parts, { type: 'video/mp4' }));
            clip.size = size;
        } else {
            // The full response still warms the HTTP cache; stream it if the memory budget is full.
            clip.retryAt = Infinity;
        }
    } catch (err) {
        if (preloaded.get(url) !== clip) return;
        clip.retryAt = Date.now() + 30_000;
        void import('@sentry/browser').then((Sentry) =>
            Sentry.captureException(err, { tags: { operation: 'score-clip-preload' } })
        );
    } finally {
        clearTimeout(timeout);
    }
}
