import { createServerFn } from '@tanstack/react-start';
import { randomUUID } from 'node:crypto';

import { standingCups } from '@/lib/cupHits';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { toLiveOps } from '@/lib/liveMatch/types';
import { cupLayout } from '@/lib/rerack';
import type { LiveMatchDto } from '@/openapi/openapi';
import { gridKey, pairFormation, validGrid, type FormationMatch } from '~/tv/lib/cupFormation';
import { apiFor, ApiError } from '~/tv/server/api';
import { authorize } from '~/tv/server/displays';

export function formationMatch(dto: LiveMatchDto): FormationMatch {
    const { state } = reduceLiveMatch(toLiveOps(dto.ops));
    const side = (team: 'blue' | 'red') => {
        const standing = standingCups(state.cupHits, team);
        return cupLayout(state.cupHits, team, state.reracks[team]).filter((slot) =>
            standing.some((c) => c.x === slot.cup.x && c.y === slot.cup.y)
        );
    };
    return { id: dto.id, seq: dto.lastSeq ?? 0, blue: side('blue'), red: side('red') };
}

// Camera observations use the existing shared re-rack op, not a second phone-only formation.
export const syncCameraFormation = createServerFn({ method: 'POST' })
    .inputValidator(
        (data: unknown) => (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    )
    .handler(async ({ data }) => {
        const camera = authorize(data.id, data.key);
        const groupId = camera.config.groupId;
        if (camera.kind !== 'camera' || !groupId || !camera.refreshToken) return 'unpaired';
        const team = data.team;
        if (
            (team !== 'blue' && team !== 'red') ||
            typeof data.matchId !== 'string' ||
            !Number.isSafeInteger(data.seq) ||
            !validGrid(data.drawn)
        )
            return 'invalid';
        const api = apiFor(camera.refreshToken);
        const dto = (await api.liveMatches(groupId)).find((m) => m.id === data.matchId);
        if (!dto || camera.config.groupId !== groupId) return 'ended';
        const match = formationMatch(dto);
        if (match.seq !== data.seq) return 'stale';
        const slots = match[team];
        if (slots.length !== data.drawn.length) return 'count-mismatch';
        if (gridKey(slots.map((s) => s.drawn)) === gridKey(data.drawn)) return 'unchanged';
        try {
            await api.appendFormation(groupId, match.id, {
                expectedSeq: match.seq,
                ops: [
                    {
                        id: randomUUID(),
                        type: 'SET_RERACK',
                        team,
                        cups: pairFormation(slots, data.drawn),
                        drawn: data.drawn,
                    },
                ],
            });
            return 'updated';
        } catch (error) {
            if (error instanceof ApiError && error.code === 'liveMatchStale') return 'stale';
            if (
                error instanceof ApiError &&
                (error.code === 'liveMatchEnded' || error.code === 'liveMatchNotFound')
            )
                return 'ended';
            throw error;
        }
    });
