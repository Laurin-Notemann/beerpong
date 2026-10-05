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
