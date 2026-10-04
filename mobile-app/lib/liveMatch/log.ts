import { countCups } from '@/api/utils/ruleMoveCups';
import { CupTeam } from '@/lib/cupHits';
import type { LiveMatchState, LiveOp } from '@/lib/liveMatch/types';
import type { Components } from '@/openapi/openapi';

/**
 * adds the incoming ops to the confirmed ones: one op per seq, sorted by seq. Works on wire ops
 * too, since the server never changes an op once it has a seq.
 */
export function mergeOps<T extends { seq?: number }>(
    confirmed: T[],
    incoming: T[]
) {
    const bySeq = new Map<number, T>();

    for (const op of [...confirmed, ...incoming]) {
        if (op.seq === undefined || bySeq.has(op.seq)) continue;
        bySeq.set(op.seq, op);
    }
    return [...bySeq.values()].sort((a, b) => a.seq! - b.seq!);
}

/** whether the confirmed log is missing a seq, i.e. an event was missed and a refetch is due */
export const hasGap = (ops: { seq?: number }[]) =>
    ops.some((op, idx) => op.seq !== idx + 1);

/** what this phone shows: the server's log, then my ops it hasn't confirmed yet */
export function composeOps(confirmed: LiveOp[], pending: LiveOp[]) {
    const confirmedIds = new Set(confirmed.map((i) => i.id));

    return [...confirmed, ...pending.filter((i) => !confirmedIds.has(i.id))];
}

/** the teams as `createMatch` takes them: `[blue, red]`, zero counts left out */
export function toTeamCreateDtos(
    state: LiveMatchState
): Components.Schemas.TeamCreateDto[] {
    const toDto = (team: LiveMatchState['redTeam']) => ({
        teamMembers: team.teamMembers.map((player) => ({
            playerId: player.playerId,
            moves: player.moves
                .filter((move) => move.count > 0)
                .map((move) => ({ moveId: move.moveId, count: move.count })),
        })),
    });
    return [toDto(state.blueTeam), toDto(state.redTeam)];
}

/** the cups a team took off the table; `moves` are the rule's moves with their `cups` per hit */
export function teamScore(
    state: LiveMatchState,
    team: CupTeam,
    moves: { id: string; cups: number }[]
) {
    const members = (team === 'red' ? state.redTeam : state.blueTeam)
        .teamMembers;
    const cups = new Map(moves.map((i) => [i.id, i.cups]));

    return countCups(
        members.flatMap((player) =>
            player.moves.map((move) => ({
                count: move.count,
                cups: cups.get(move.moveId) ?? 0,
            }))
        )
    );
}

/** `m:ss`, or `h:mm:ss` past an hour */
export function formatElapsed(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, '0');

    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
        : `${minutes}:${seconds}`;
}

/** how many finishes the match has; a match can only be finished with exactly one */
export const countFinishes = (
    state: LiveMatchState,
    finishMoveIds: Set<string>
) =>
    [...state.redTeam.teamMembers, ...state.blueTeam.teamMembers]
        .flatMap((player) => player.moves)
        .filter((move) => finishMoveIds.has(move.moveId))
        .reduce((sum, move) => sum + move.count, 0);

/** the server takes `ADJUST_MOVE` deltas of at most 20 either way, so bigger jumps are split */
export const MAX_MOVE_DELTA = 20;

export function splitDelta(delta: number) {
    const deltas: number[] = [];
    for (let rest = delta; rest !== 0;) {
        const step = Math.sign(rest) * Math.min(Math.abs(rest), MAX_MOVE_DELTA);
        deltas.push(step);
        rest -= step;
    }
    return deltas;
}
