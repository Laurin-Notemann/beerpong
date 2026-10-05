// The live match log is reduced with the app's own code, so a TV and the phones at the table
// always agree about teams, cups and score. These modules are plain TypeScript; keep it that way
// (no React Native imports in their import graph), or the TV stops building.
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import { type CupPosition, type CupTeam, findHit } from '@/lib/cupHits';
import { teamScore, toTeamCreateDtos } from '@/lib/liveMatch/log';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { toLiveOps } from '@/lib/liveMatch/types';
import { cupLayout } from '@/lib/rerack';
import type * as Dto from '@/openapi/openapi';

export { formatElapsed } from '@/lib/liveMatch/log';
export type { CupPosition, CupTeam };

export interface LiveTeamState {
    playerIds: string[];
    /** cups this team took off the other side */
    score: number;
    /** this team's own cups as they're drawn (re-racked on a phone, or the pyramid) */
    cups: RackCup[];
}

/** a cup where it's drawn, and whether it's still on the table */
export interface RackCup {
    at: CupPosition;
    up: boolean;
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
        cups: cupLayout(state.cupHits, side, state.reracks[side]).map((i) => ({
            at: i.drawn,
            up: !findHit(state.cupHits, side, i.cup),
        })),
    });
    // as a match would be entered right now, for the leaderboard projection
    const teams = toTeamCreateDtos(state);
    return { blue: team('blue'), red: team('red'), teams };
}
