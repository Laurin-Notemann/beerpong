// The live match log is reduced with the app's own code, so a TV and the phones at the table
// always agree about teams, cups and score. These modules are plain TypeScript; keep it that way
// (no React Native imports in their import graph), or the TV stops building.
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import { type CupPosition, type CupTeam, standingCups } from '@/lib/cupHits';
import { teamScore } from '@/lib/liveMatch/log';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { toLiveOps } from '@/lib/liveMatch/types';
import type * as Dto from '@/openapi/openapi';

export { formatElapsed } from '@/lib/liveMatch/log';
export { CUP_FORMATION } from '@/lib/cupHits';
export type { CupPosition, CupTeam };

export interface LiveTeamState {
    playerIds: string[];
    /** cups this team took off the other side */
    score: number;
    /** this team's own cups still on the table */
    standing: CupPosition[];
}

/** a live match's teams and score, from its op log and its season's rule moves */
export function foldLiveMatch(dto: Dto.LiveMatchDto, ruleMoves: Dto.RuleMoveDto[]) {
    const { state } = reduceLiveMatch(toLiveOps(dto.ops));
    const cups = ruleMoves.flatMap((i) => (i.id ? [{ id: i.id, cups: cupsPerHit(i) }] : []));

    const team = (side: CupTeam): LiveTeamState => ({
        playerIds: (side === 'red' ? state.redTeam : state.blueTeam).teamMembers.map(
            (i) => i.playerId
        ),
        score: teamScore(state, side, cups),
        standing: standingCups(state.cupHits, side),
    });
    return { blue: team('blue'), red: team('red') };
}
