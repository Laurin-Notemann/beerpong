// A running live match is a log of ops that only clients interpret. It's reduced here with the
// app's own code, like on the TV, so the simulator counts the same teams and moves the phones
// show. Keep the imported modules free of React Native imports.
import { CUP_FORMATION, type CupPosition, type CupTeam, findHit } from '@/lib/cupHits';
import { toTeamCreateDtos } from '@/lib/liveMatch/log';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { type LiveOp, toLiveOps } from '@/lib/liveMatch/types';
import type * as Dto from '@/openapi/openapi';

export type LiveMatchDto = Dto.LiveMatchDto;

/** the live match's teams as a match would be entered right now; null while a team is empty */
export function liveTeams(dto: LiveMatchDto) {
    const teams = toTeamCreateDtos(reduceLiveMatch(toLiveOps(dto.ops)).state);
    return teams.every((t) => t.teamMembers?.length) ? teams : null;
}

export type ReplayStep = Dto.EloReplayStepDto;
export type ScoreOp = Extract<LiveOp, { type: 'RECORD_CUP_HIT' | 'UNDO_CUP_HIT' | 'ADJUST_MOVE' }>;
export { CUP_FORMATION, findHit };
export type { CupPosition, CupTeam };

const isScoreOp = (op: LiveOp): op is ScoreOp =>
    op.type === 'RECORD_CUP_HIT' || op.type === 'UNDO_CUP_HIT' || op.type === 'ADJUST_MOVE';

/**
 * A finished live match, step by step: before the first throw, then after every op that changed
 * the score (ops the log ignored left out). Each step has the state for drawing the table and
 * its teams `[blue, red]` like the stored match, for the API to rate.
 */
export function replaySteps(dto: LiveMatchDto) {
    const ops = toLiveOps(dto.ops);
    const ignored = new Set(reduceLiveMatch(ops).ignoredOpIds);
    const scoring = ops.flatMap((op, i) =>
        isScoreOp(op) && !ignored.has(op.id) ? [{ i, op }] : []
    );
    const at = (end: number, op?: ScoreOp) => {
        const state = reduceLiveMatch(ops.slice(0, end)).state;
        const [blue, red] = toTeamCreateDtos(state);
        return { op, state, step: { teams: [blue, red] } satisfies ReplayStep };
    };
    return [at(scoring[0]?.i ?? ops.length), ...scoring.map(({ i, op }) => at(i + 1, op))].filter(
        (s) => s.step.teams.every((t) => t.teamMembers?.length)
    );
}
