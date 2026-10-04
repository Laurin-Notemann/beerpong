import { Formation, FormationType } from '@/components/CupGrid/Formation';

/**
 * Pro mode: the cups of the new match draft. Both teams start with the 10-cup pyramid; the draft
 * keeps a log of hits, and which cups still stand is derived from it. A hit also counts as one
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
 * The moves a hit on a team with `standing` cups left can be: anything that takes at least one
 * cup and no more than are left. A finish that takes cups (the rings) has to take all of them,
 * and a match has only one finish.
 */
export const hittableMoves = <T extends CupMove>(
    moves: T[],
    standing: number,
    hasFinish: boolean
) =>
    moves.filter(
        (move) =>
            move.cups >= 1 &&
            (move.isFinish
                ? !hasFinish && move.cups === standing
                : move.cups <= standing)
    );

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

/**
 * The cups a hit on `cup` takes: the tapped one, then the closest ones still standing (a bouncer
 * takes two). Undefined if the cup is already gone or not enough cups are left.
 */
export function cupsTakenBy(
    hits: CupHit[],
    team: CupTeam,
    cup: CupPosition,
    move: CupMove
): CupPosition[] | undefined {
    const standing = standingCups(hits, team);
    const tapped = standing.find((i) => samePosition(i, cup));

    if (!tapped || move.cups < 1 || move.cups > standing.length) return;

    const distance = (i: CupPosition) =>
        (i.x - cup.x) ** 2 + (i.y - cup.y) ** 2;

    const others = standing
        .filter((i) => i !== tapped)
        .sort((a, b) => distance(a) - distance(b) || a.y - b.y || a.x - b.x);

    return [tapped, ...others.slice(0, move.cups - 1)].map(({ x, y }) => ({
        x,
        y,
    }));
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
