import {
    CupHit,
    CupTeam,
    DraftTeams,
    findHit,
    PlayerDraft,
    updateMoves,
    withHits,
} from '@/lib/cupHits';
import type { LiveMatchState, LiveOp } from '@/lib/liveMatch/types';

export const emptyLiveMatchState: LiveMatchState = {
    redTeam: { teamMembers: [] },
    blueTeam: { teamMembers: [] },
    cupHits: [],
    reracks: {},
    misses: [],
};

const teamOf = (state: DraftTeams, playerId: string): CupTeam | undefined =>
    state.redTeam.teamMembers.some((i) => i.playerId === playerId)
        ? 'red'
        : state.blueTeam.teamMembers.some((i) => i.playerId === playerId)
          ? 'blue'
          : undefined;

/** counts the hit's move (and finish) up or down for its scorer, like the draft store does */
function countHit(state: DraftTeams, hit: CupHit, by: 1 | -1) {
    let teams = updateMoves(
        state,
        hit.playerId,
        hit.moveId,
        (count) => count + by
    );
    if (hit.finishMoveId) {
        teams = updateMoves(
            teams,
            hit.playerId,
            hit.finishMoveId,
            (count) => count + by
        );
    }
    return teams;
}

/**
 * Applies one op: the parts of the state it changes. Returns undefined if the op is invalid in
 * this state and changes nothing.
 */
function apply(
    state: LiveMatchState,
    op: LiveOp
): Partial<LiveMatchState> | undefined {
    switch (op.type) {
        case 'SET_TEAMS': {
            // players keep their moves if they stay on the same team
            const members = (current: PlayerDraft[], ids: string[]) =>
                ids.map(
                    (playerId): PlayerDraft =>
                        current.find((i) => i.playerId === playerId) ?? {
                            playerId,
                            moves: [],
                        }
                );
            return withHits({
                redTeam: {
                    teamMembers: members(
                        state.redTeam.teamMembers,
                        op.redPlayerIds
                    ),
                },
                blueTeam: {
                    teamMembers: members(
                        state.blueTeam.teamMembers,
                        op.bluePlayerIds
                    ),
                },
                cupHits: state.cupHits,
            });
        }
        case 'SET_PLAYER_TEAM': {
            if (!op.team && !teamOf(state, op.playerId)) return;

            // a player who changes teams starts over with no moves
            const without = (members: PlayerDraft[]) =>
                members.filter((i) => i.playerId !== op.playerId);
            const added = { playerId: op.playerId, moves: [] };

            return withHits({
                redTeam: {
                    teamMembers:
                        op.team === 'red'
                            ? [...without(state.redTeam.teamMembers), added]
                            : without(state.redTeam.teamMembers),
                },
                blueTeam: {
                    teamMembers:
                        op.team === 'blue'
                            ? [...without(state.blueTeam.teamMembers), added]
                            : without(state.blueTeam.teamMembers),
                },
                cupHits: state.cupHits,
            });
        }
        case 'ADJUST_MOVE': {
            if (!teamOf(state, op.playerId)) return;

            return withHits({
                ...updateMoves(
                    state,
                    op.playerId,
                    op.moveId,
                    (count) => count + op.delta
                ),
                cupHits: state.cupHits,
            });
        }
        case 'RECORD_CUP_HIT': {
            const scorerTeam = teamOf(state, op.playerId);
            if (!scorerTeam || scorerTeam === op.team) return;
            // the first hit in the log wins a cup, whoever sent it
            if (op.cups.some((cup) => findHit(state.cupHits, op.team, cup))) {
                return;
            }
            const hit: CupHit = {
                team: op.team,
                playerId: op.playerId,
                moveId: op.moveId,
                cups: op.cups,
                finishMoveId: op.finishMoveId,
            };
            return withHits({
                ...countHit(state, hit, 1),
                cupHits: [...state.cupHits, hit],
            });
        }
        case 'UNDO_CUP_HIT': {
            const hit = findHit(state.cupHits, op.team, op.cup);
            if (!hit) return;

            return withHits({
                ...countHit(state, hit, -1),
                cupHits: state.cupHits.filter((i) => i !== hit),
            });
        }
        case 'SET_RERACK': {
            // whether it still fits the cups standing is up to the screens (cupLayout)
            const rerack = op.cups.length
                ? {
                      formationId: op.formationId ?? '',
                      slots: op.cups.map((cup, idx) => ({
                          cup,
                          drawn: op.drawn[idx],
                      })),
                  }
                : undefined;
            return { reracks: { ...state.reracks, [op.team]: rerack } };
        }
        case 'RECORD_MISS': {
            const team = teamOf(state, op.playerId);
            if (!team) return;

            return {
                misses: [...state.misses, { playerId: op.playerId, team }],
            };
        }
        case 'UNDO_MISS': {
            // no findLastIndex: the TV's browser (Chromium 63) runs this too
            const idx = state.misses
                .map((i) => i.playerId)
                .lastIndexOf(op.playerId);
            if (idx < 0) return;

            return { misses: state.misses.filter((_, i) => i !== idx) };
        }
    }
}

/** misses go with their player, like hits: gone when the player leaves or switches teams */
const keepMisses = (state: LiveMatchState): LiveMatchState => {
    const misses = state.misses.filter(
        (i) => teamOf(state, i.playerId) === i.team
    );
    return misses.length === state.misses.length ? state : { ...state, misses };
};

/**
 * Every phone reduces the same ordered log, so all of them end up in the same state. Ops that
 * are invalid by the time their turn comes (a cup someone else took first, a player who left)
 * change nothing and are reported in `ignoredOpIds`.
 */
export function reduceLiveMatch(ops: LiveOp[]) {
    const ignoredOpIds: string[] = [];
    let state = emptyLiveMatchState;

    for (const op of ops) {
        const next = apply(state, op);
        if (next) state = keepMisses({ ...state, ...next });
        else ignoredOpIds.push(op.id);
    }
    return { state, ignoredOpIds };
}
