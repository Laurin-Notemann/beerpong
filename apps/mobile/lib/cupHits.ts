import { Formation, FormationType } from '@/components/CupGrid/Formation';

/**
 * Pro mode: the cups of a match being entered. Both teams start with the 10-cup pyramid; the
 * match keeps a log of hits, and which cups still stand is derived from it. A hit also counts as one
 * of its move on the points page, so the two pages can't disagree about the score.
 */

export type CupTeam = 'red' | 'blue';

export const CUP_FORMATION: FormationType = Formation.Pyramid_10;

export interface CupPosition {
    x: number;
    y: number;
}

export interface CupHit {
    /** the team whose cups were hit, i.e. the team the scorer plays against */
    team: CupTeam;
    playerId: string;
    moveId: string;
    /** the cups this hit took off the table, the tapped one first */
    cups: CupPosition[];
    /** the finish credited to the scorer because this hit took the team's last cup */
    finishMoveId?: string;
}

export interface CupMove {
    id: string;
    name?: string;
    /** cups one hit of this move takes off the table (see cupsPerHit) */
    cups: number;
    isFinish: boolean;
}

interface DraftPlayer {
    playerId: string;
    team: CupTeam;
    moves: { moveId: string; count: number }[];
}

const samePosition = (a: CupPosition, b: CupPosition) =>
    a.x === b.x && a.y === b.y;

export const findHit = (hits: CupHit[], team: CupTeam, cup: CupPosition) =>
    hits.find(
        (hit) => hit.team === team && hit.cups.some((i) => samePosition(i, cup))
    );

export const standingCups = (hits: CupHit[], team: CupTeam) =>
    CUP_FORMATION.cups.filter((cup) => !findHit(hits, team, cup));

/**
 * A ring is thrown at a shape: the cups left right before it. Ring of fire leaves everything but
 * the corners and the middle cup, ring of water just those four. Keyed by the cups the ring takes.
 */
const RING_SHAPES: Record<number, CupPosition[]> = {
    6: [
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 1, y: 2 },
        { x: 5, y: 2 },
        { x: 2, y: 4 },
        { x: 4, y: 4 },
    ],
    4: [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 3, y: 2 },
        { x: 3, y: 6 },
    ],
};

const isShape = (cups: CupPosition[], shape: CupPosition[]) =>
    cups.length === shape.length &&
    shape.every((i) => cups.some((j) => samePosition(i, j)));

/**
 * How a finish that takes cups (a ring) can go in on a tap at `cup`: 'whole' when the cups left
 * are its shape, 'completes' when the tapped cup is the one cup between the table and its shape
 * (that hit and the ring go in together, see ringCompletion). A ring without a known shape
 * needs exactly the cups that are left.
 */
export function ringHit(
    move: CupMove,
    standing: CupPosition[],
    cup: CupPosition
): 'whole' | 'completes' | undefined {
    const shape = RING_SHAPES[move.cups];

    if (!shape) return move.cups === standing.length ? 'whole' : undefined;
    if (isShape(standing, shape)) return 'whole';
    if (
        isShape(
            standing.filter((i) => !samePosition(i, cup)),
            shape
        )
    ) {
        return 'completes';
    }
}

/**
 * The moves a hit on `cup` can be, with `standing` cups left: anything that takes at least one
 * cup and no more than are left. A ring only when the cups left (or left after this one) are its
 * shape, and a match has only one finish.
 */
export const hittableMoves = <T extends CupMove>(
    moves: T[],
    standing: CupPosition[],
    cup: CupPosition,
    hasFinish: boolean
) =>
    moves.filter(
        (move) =>
            move.cups >= 1 &&
            (move.isFinish
                ? !hasFinish && !!ringHit(move, standing, cup)
                : move.cups <= standing.length)
    );

/**
 * The hit on the cup that completes a ring's shape, thrown together with the ring: a normal hit
 * (the first move that takes one cup) on the tapped cup, and the ring taking the rest.
 */
export function ringCompletion(
    moves: CupMove[],
    ring: CupMove,
    standing: CupPosition[],
    cup: CupPosition
): Pick<CupHit, 'moveId' | 'cups' | 'finishMoveId'> | undefined {
    const normal = moves.find((i) => !i.isFinish && i.cups === 1);
    if (!normal || ringHit(ring, standing, cup) !== 'completes') return;

    return {
        moveId: normal.id,
        cups: [cup, ...standing.filter((i) => !samePosition(i, cup))].map(
            ({ x, y }) => ({ x, y })
        ),
        finishMoveId: ring.id,
    };
}

/**
 * The ring a hit taking `taken` (a bouncer's two cups) leaves the shape of, if the match has no
 * finish yet. The scorer may have thrown the ring with it: then the hit takes the rest too.
 */
export function ringLeftBy<T extends CupMove>(
    moves: T[],
    standing: CupPosition[],
    taken: CupPosition[],
    hasFinish: boolean
): T | undefined {
    if (hasFinish) return;

    const left = standing.filter((i) => !taken.some((j) => samePosition(i, j)));

    return moves.find(
        (move) =>
            move.isFinish &&
            !!RING_SHAPES[move.cups] &&
            isShape(left, RING_SHAPES[move.cups])
    );
}

/**
 * The finish that comes with a hit: the hit on a team's last cup also finishes the match, unless
 * its move is a finish itself (the rings) or the match already has one. Several finishes that
 * take no cups means the scorer has to pick one ('ask').
 */
export function finishForHit(
    move: CupMove,
    standing: number,
    hasFinish: boolean,
    moves: CupMove[]
): { finishMoveId?: string } | 'ask' {
    if (move.cups < standing || move.isFinish || hasFinish) return {};

    const finishes = finishesOnTopOfLastCup(moves);

    return finishes.length > 1 ? 'ask' : { finishMoveId: finishes[0]?.id };
}

export const finishesOnTopOfLastCup = <T extends CupMove>(moves: T[]) =>
    moves.filter((move) => move.isFinish && move.cups === 0);

/** whether the scorer picks the other cups a hit takes (a bouncer's second cup), see cupsTakenBy */
export const picksOtherCups = (move: CupMove, standing: number) =>
    move.cups > 1 && move.cups < standing;

/**
 * The cups a hit on `cup` takes: the tapped one, then the `others` the scorer picked (a bouncer
 * takes a second cup of their choice). A move that takes every cup left (the rings, a bouncer on
 * the last two) needs no picks. Undefined if a cup is already gone or the picks don't add up.
 */
export function cupsTakenBy(
    hits: CupHit[],
    team: CupTeam,
    cup: CupPosition,
    move: CupMove,
    others: CupPosition[] = []
): CupPosition[] | undefined {
    const standing = standingCups(hits, team);
    const tapped = standing.find((i) => samePosition(i, cup));

    if (!tapped || move.cups < 1 || move.cups > standing.length) return;

    const rest =
        move.cups === standing.length
            ? standing.filter((i) => i !== tapped)
            : others.map((i) => standing.find((j) => samePosition(i, j)));

    if (
        rest.length !== move.cups - 1 ||
        rest.some((i, idx) => !i || i === tapped || rest.indexOf(i) !== idx)
    ) {
        return;
    }

    return [tapped, ...(rest as CupPosition[])].map(({ x, y }) => ({ x, y }));
}

/** whether one of the players already has a finish counted; a match has only one */
export const hasFinish = (
    players: { moves: { moveId: string; count: number }[] }[],
    moves: CupMove[]
) =>
    players.some((player) =>
        player.moves.some(
            (move) =>
                move.count > 0 &&
                moves.find((i) => i.id === move.moveId)?.isFinish
        )
    );

/**
 * Dragging to a scorer records the default move without questions. Extra cups are taken in
 * formation order; on the last cup, prefer the normal finish. Taps still offer every choice.
 * Undefined only when the cup is gone or the move cannot fit the remaining cups.
 */
export function quickHit(
    hits: CupHit[],
    team: CupTeam,
    cup: CupPosition,
    move: CupMove,
    hasFinish: boolean,
    moves: CupMove[]
): Pick<CupHit, 'cups' | 'finishMoveId'> | undefined {
    const standing = standingCups(hits, team);
    if (
        move.isFinish ||
        !hittableMoves([move], standing, cup, hasFinish).length
    )
        return;

    const others = standing
        .filter((i) => !samePosition(i, cup))
        .slice(0, move.cups - 1);
    const cups = cupsTakenBy(hits, team, cup, move, others);
    if (!cups) return;

    const finishes = finishesOnTopOfLastCup(moves);
    const finish =
        finishes.find((i) => i.name === 'Finish - Normal') ?? finishes[0];
    return {
        cups,
        finishMoveId:
            !hasFinish && cups.length === standing.length
                ? finish?.id
                : undefined,
    };
}

/**
 * Drops the hits the players' move counts no longer cover: hits of players who left the match or
 * switched to the team they hit, and the latest hits of a move whose count went down on the
 * points page. Their cups go back on the table.
 *
 * A finish only stands while its team has no cups left, so `takenBackFinishes` lists the
 * finishes the caller has to uncount: those of dropped hits, and those of a team that has cups
 * standing again.
 */
export function reconcileHits(hits: CupHit[], players: DraftPlayer[]) {
    const used = new Map<string, number>();
    const fits = (player: DraftPlayer, moveId: string) => {
        const key = player.playerId + ':' + moveId;
        const count = player.moves.find((i) => i.moveId === moveId)?.count ?? 0;
        const next = (used.get(key) ?? 0) + 1;

        if (next > count) return false;

        used.set(key, next);
        return true;
    };

    const kept: CupHit[] = [];
    const takenBackFinishes: { playerId: string; moveId: string }[] = [];

    for (const hit of hits) {
        const player = players.find((i) => i.playerId === hit.playerId);

        if (!player || player.team === hit.team) continue;

        if (!fits(player, hit.moveId)) {
            if (hit.finishMoveId) {
                takenBackFinishes.push({
                    playerId: hit.playerId,
                    moveId: hit.finishMoveId,
                });
            }
            continue;
        }
        if (hit.finishMoveId && !fits(player, hit.finishMoveId)) {
            // the finish was already uncounted on the points page
            kept.push({ ...hit, finishMoveId: undefined });
        } else {
            kept.push(hit);
        }
    }

    const result = kept.map((hit) => {
        if (!hit.finishMoveId || standingCups(kept, hit.team).length === 0) {
            return hit;
        }
        takenBackFinishes.push({
            playerId: hit.playerId,
            moveId: hit.finishMoveId,
        });
        return { ...hit, finishMoveId: undefined };
    });

    const unchanged =
        result.length === hits.length &&
        result.every((hit, idx) => hit === hits[idx]);

    return { hits: unchanged ? hits : result, takenBackFinishes };
}

interface MoveDraft {
    moveId: string;
    count: number;
}
export interface PlayerDraft {
    playerId: string;
    moves: MoveDraft[];
}
export interface TeamDraft {
    teamMembers: PlayerDraft[];
}
export interface DraftTeams {
    redTeam: TeamDraft;
    blueTeam: TeamDraft;
}

/** sets one move count of a player (at least 0), wherever they play */
export function updateMoves(
    teams: DraftTeams,
    playerId: string,
    moveId: string,
    update: (count: number) => number
): DraftTeams {
    const updateTeam = (team: TeamDraft): TeamDraft => ({
        teamMembers: team.teamMembers.map((player) => {
            if (player.playerId !== playerId) return player;

            const current =
                player.moves.find((i) => i.moveId === moveId)?.count ?? 0;
            const count = Math.max(0, update(current));

            return {
                ...player,
                moves: player.moves.some((i) => i.moveId === moveId)
                    ? player.moves.map((i) =>
                          i.moveId === moveId ? { ...i, count } : i
                      )
                    : [...player.moves, { moveId, count }],
            };
        }),
    });
    return {
        redTeam: updateTeam(teams.redTeam),
        blueTeam: updateTeam(teams.blueTeam),
    };
}

/** keeps the cup hits in line with the teams and move counts they're paired with */
export function withHits(
    state: DraftTeams & { cupHits: CupHit[] }
): DraftTeams & { cupHits: CupHit[] } {
    const { hits, takenBackFinishes } = reconcileHits(state.cupHits, [
        ...state.redTeam.teamMembers.map((i) => ({
            ...i,
            team: 'red' as const,
        })),
        ...state.blueTeam.teamMembers.map((i) => ({
            ...i,
            team: 'blue' as const,
        })),
    ]);
    const teams = takenBackFinishes.reduce<DraftTeams>(
        (acc, finish) =>
            updateMoves(acc, finish.playerId, finish.moveId, (n) => n - 1),
        state
    );
    return { redTeam: teams.redTeam, blueTeam: teams.blueTeam, cupHits: hits };
}
