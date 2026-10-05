import { CupHit, CupPosition, CupTeam, DraftTeams } from '@/lib/cupHits';
import type { Rerack } from '@/lib/rerack';
import type { Components } from '@/openapi/openapi';
import { ScopedLogger } from '@/utils/logging';

export type LiveMatchDto = Components.Schemas.LiveMatchDto;
export type LiveMatchOpDto = Components.Schemas.LiveMatchOpDto;

interface OpBase {
    /** client-generated, makes retries idempotent */
    id: string;
    /** position in the server's log; undefined while the op is only pending on this phone */
    seq?: number;
}

export type LiveOp = OpBase &
    (
        | { type: 'SET_TEAMS'; redPlayerIds: string[]; bluePlayerIds: string[] }
        | { type: 'SET_PLAYER_TEAM'; playerId: string; team: CupTeam | null }
        | {
              type: 'ADJUST_MOVE';
              playerId: string;
              moveId: string;
              delta: number;
          }
        | {
              type: 'RECORD_CUP_HIT';
              team: CupTeam;
              playerId: string;
              moveId: string;
              cups: CupPosition[];
              finishMoveId?: string;
          }
        | { type: 'UNDO_CUP_HIT'; team: CupTeam; cup: CupPosition }
        | {
              /** the team's standing `cups` drawn at `drawn` (pairwise); none: the pyramid */
              type: 'SET_RERACK';
              team: CupTeam;
              cups: CupPosition[];
              drawn: CupPosition[];
              formationId?: string;
          }
        /** a throw that missed; only phones that track misses (Experimental Features) send it */
        | { type: 'RECORD_MISS'; playerId: string }
        /** takes back the player's latest miss */
        | { type: 'UNDO_MISS'; playerId: string }
    );

/** the state the entry screens render, shaped like the match draft store's */
export interface LiveMatchState extends DraftTeams {
    cupHits: CupHit[];
    /** teams whose cups were put back together in another formation, on any phone */
    reracks: Partial<Record<CupTeam, Rerack>>;
    /** the throws that missed, in order, by the thrower's team */
    misses: { playerId: string; team: CupTeam }[];
}

const logger = new ScopedLogger('live-match');

const isTeam = (value: unknown): value is CupTeam =>
    value === 'red' || value === 'blue';

const toCups = (cups: { x?: number; y?: number }[] | undefined) =>
    cups?.every((i) => typeof i.x === 'number' && typeof i.y === 'number')
        ? cups.map((i) => ({ x: i.x!, y: i.y! }))
        : undefined;

/** The one place the all-optional generated op becomes a strict one. Malformed ops are dropped. */
export function toLiveOp(dto: LiveMatchOpDto): LiveOp | undefined {
    const base = { id: dto.id ?? '', seq: dto.seq };
    const op = ((): LiveOp | undefined => {
        switch (dto.type) {
            case 'SET_TEAMS':
                if (!dto.redPlayerIds || !dto.bluePlayerIds) return;
                return {
                    ...base,
                    type: dto.type,
                    redPlayerIds: dto.redPlayerIds,
                    bluePlayerIds: dto.bluePlayerIds,
                };
            case 'SET_PLAYER_TEAM':
                if (!dto.playerId) return;
                if (dto.team != null && !isTeam(dto.team)) return;
                return {
                    ...base,
                    type: dto.type,
                    playerId: dto.playerId,
                    team: dto.team ?? null,
                };
            case 'ADJUST_MOVE':
                if (!dto.playerId || !dto.moveId || !dto.delta) return;
                return {
                    ...base,
                    type: dto.type,
                    playerId: dto.playerId,
                    moveId: dto.moveId,
                    delta: dto.delta,
                };
            case 'RECORD_CUP_HIT': {
                const cups = toCups(dto.cups);
                if (
                    !isTeam(dto.team) ||
                    !dto.playerId ||
                    !dto.moveId ||
                    !cups?.length
                ) {
                    return;
                }
                return {
                    ...base,
                    type: dto.type,
                    team: dto.team,
                    playerId: dto.playerId,
                    moveId: dto.moveId,
                    cups,
                    finishMoveId: dto.finishMoveId ?? undefined,
                };
            }
            case 'UNDO_CUP_HIT': {
                const cup = toCups(dto.cup ? [dto.cup] : undefined)?.[0];
                if (!isTeam(dto.team) || !cup) return;
                return { ...base, type: dto.type, team: dto.team, cup };
            }
            case 'SET_RERACK': {
                const cups = toCups(dto.cups ?? []);
                const drawn = toCups(dto.drawn ?? []);
                if (!isTeam(dto.team) || !cups || !drawn) return;
                if (cups.length !== drawn.length) return;
                return {
                    ...base,
                    type: dto.type,
                    team: dto.team,
                    cups,
                    drawn,
                    formationId: dto.formationId ?? undefined,
                };
            }
            case 'RECORD_MISS':
            case 'UNDO_MISS':
                if (!dto.playerId) return;
                return { ...base, type: dto.type, playerId: dto.playerId };
        }
    })();

    if (!op || !op.id) {
        logger.warn('dropping malformed live match op', dto);
        return;
    }
    return op;
}

export const toLiveOps = (dtos: LiveMatchOpDto[] | undefined) =>
    (dtos ?? []).flatMap((dto) => toLiveOp(dto) ?? []);

/** the wire form of an op, for create and append requests (the server assigns seq) */
export function toLiveOpDto(op: LiveOp): LiveMatchOpDto {
    const { seq: _seq, ...rest } = op;
    // no team on SET_PLAYER_TEAM means remove: the field is left out, not null
    return rest.type === 'SET_PLAYER_TEAM'
        ? { ...rest, team: rest.team ?? undefined }
        : rest;
}
