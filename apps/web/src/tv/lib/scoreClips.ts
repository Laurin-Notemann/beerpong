import type { LiveMatchOpDto } from '@/openapi/openapi';
import type { LiveMatchView } from '~/tv/server/board';

/** a player's score clip, waiting to play on the TV */
export interface ScoreClip {
    /** the op that scored */
    id: string;
    /** stable identity of the mounted video, independent of each score */
    key: string;
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
                return [
                    {
                        id: op.id ?? '',
                        key: clipKey(match.id, player.id, team, url),
                        url,
                        name: player.name,
                        team,
                    },
                ];
            }
        }
        return [];
    });
}

/** the clip's first or last frame (server/clips.ts), over the video while it starts and stops */
export const frameOf = (url: string, frame: 'first' | 'last') => `${url}?frame=${frame}`;

/** All clips on the board, with stable keys so a score or a board refresh never remounts them. */
export function liveScoreClips(matches: LiveMatchView[]): Omit<ScoreClip, 'id'>[] {
    return matches.flatMap((match) =>
        (['blue', 'red'] as const).flatMap((team) =>
            match[team].players.flatMap((player) =>
                (player.scoreClipUrls ?? []).map((url) => ({
                    key: clipKey(match.id, player.id, team, url),
                    url,
                    name: player.name,
                    team,
                }))
            )
        )
    );
}

const clipKey = (matchId: string, playerId: string, team: string, url: string) =>
    JSON.stringify([matchId, playerId, team, url]);

/** Tizen renders file videos in a separate native layer; this says nothing about decoder count. */
export const usesNativeVideoLayer = () => /Tizen|SmartTV|SMART-TV/i.test(navigator.userAgent);
