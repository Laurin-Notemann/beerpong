// The live match log is reduced with the app's own code, so a TV and the phones at the table
// always agree about teams, cups and score. These modules are plain TypeScript; keep it that way
// (no React Native imports in their import graph), or the TV stops building.
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import { type CupPosition, type CupTeam, findHit } from '@/lib/cupHits';
import { moveLog } from '@/lib/liveMatch/labels';
import { teamScore, toTeamCreateDtos } from '@/lib/liveMatch/log';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { toLiveOps } from '@/lib/liveMatch/types';
import { cupLayout } from '@/lib/rerack';
import type * as Dto from '@/openapi/openapi';

export { formatElapsed } from '@/lib/liveMatch/log';
export type { CupPosition, CupTeam };

export interface LiveTeamState {
    playerIds: string[];
    /** per-player match points: own moves plus bonuses from all team moves */
    points: Record<string, number>;
    /** cups this team took off the other side */
    score: number;
    /** this team's own cups as they're drawn (re-racked on a phone, or the pyramid) */
    cups: RackCup[];
}

/** a cup where it's drawn, and whether it's still on the table */
export interface RackCup {
    at: CupPosition;
    original?: CupPosition;
    up: boolean;
}

/** a live match's teams and score, from its op log and its season's rule moves */
export function foldLiveMatch(
    dto: Pick<Dto.LiveMatchDto, 'ops'>,
    ruleMoves: (Pick<Dto.RuleMoveDto, 'id' | 'name' | 'finishingMove' | 'cups'> &
        Partial<Pick<Dto.RuleMoveDto, 'pointsForScorer' | 'pointsForTeam'>>)[]
) {
    const { state } = reduceLiveMatch(toLiveOps(dto.ops));
    const cups = ruleMoves.flatMap((i) => (i.id ? [{ id: i.id, cups: cupsPerHit(i) }] : []));

    const pointsOf = (side: CupTeam) => {
        const members = (side === 'red' ? state.redTeam : state.blueTeam).teamMembers;
        const value = (
            moves: (typeof members)[number]['moves'],
            field: 'pointsForScorer' | 'pointsForTeam'
        ) =>
            moves.reduce(
                (sum, move) =>
                    sum +
                    move.count * (ruleMoves.find((rule) => rule.id === move.moveId)?.[field] ?? 0),
                0
            );
        const bonus = value(
            members.flatMap((member) => member.moves),
            'pointsForTeam'
        );
        return Object.fromEntries(
            members.map((member) => [
                member.playerId,
                value(member.moves, 'pointsForScorer') + bonus,
            ])
        );
    };
    const team = (side: CupTeam): LiveTeamState => ({
        points: pointsOf(side),
        playerIds: (side === 'red' ? state.redTeam : state.blueTeam).teamMembers.map(
            (i) => i.playerId
        ),
        score: teamScore(state, side, cups),
        cups: cupLayout(state.cupHits, side, state.reracks[side]).map((i) => ({
            at: i.drawn,
            original: i.cup,
            up: !findHit(state.cupHits, side, i.cup),
        })),
    });
    // as a match would be entered right now, for the leaderboard projection
    const teams = toTeamCreateDtos(state);
    // the cup hits so far, newest first, as the phones' widget lists them
    const moves = moveLog(state.cupHits, ruleMoves);
    return { blue: team('blue'), red: team('red'), teams, moves };
}
