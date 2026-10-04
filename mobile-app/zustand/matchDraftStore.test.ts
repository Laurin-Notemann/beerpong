import { beforeEach, describe, expect, it } from 'vitest';

import { rotatePoint } from '@/components/CupGrid/Formation';
import {
    CUP_FORMATION,
    CupMove,
    cupsTakenBy,
    CupTeam,
    finishForHit,
    hittableMoves,
    standingCups,
} from '@/lib/cupHits';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

// the default beerpong rules, with their cups (see RuleMoveCups.java)
const normal: CupMove = { id: 'normal', cups: 1, isFinish: false };
const bomb: CupMove = { id: 'bomb', cups: 1, isFinish: false };
const bouncer: CupMove = { id: 'bouncer', cups: 2, isFinish: false };
const save: CupMove = { id: 'save', cups: 0, isFinish: false };
const finish: CupMove = { id: 'finish', cups: 0, isFinish: true };
const ringOfFire: CupMove = { id: 'ring-of-fire', cups: 4, isFinish: true };
const moves = [normal, bomb, bouncer, save, finish, ringOfFire];

const draft = () => useMatchDraftStore.getState();
const actions = () => draft().actions;

const count = (playerId: string, moveId: string) =>
    [...draft().redTeam.teamMembers, ...draft().blueTeam.teamMembers]
        .find((i) => i.playerId === playerId)
        ?.moves.find((i) => i.moveId === moveId)?.count ?? 0;

const standing = (team: CupTeam) => standingCups(draft().cupHits, team).length;

/** what the cups page and its sheet do when a cup is tapped and a move picked */
function hit(
    team: CupTeam,
    cup: { x: number; y: number },
    playerId: string,
    move: CupMove
) {
    const cups = cupsTakenBy(draft().cupHits, team, cup, move);
    if (!cups) throw new Error('cup is not hittable');

    const finish = finishForHit(move, standing(team), hasFinish(), moves);
    if (finish === 'ask') throw new Error('the scorer has to pick a finish');

    actions().recordCupHit({
        team,
        playerId,
        moveId: move.id,
        cups,
        finishMoveId: finish.finishMoveId,
    });
}

const hasFinish = () =>
    [...draft().redTeam.teamMembers, ...draft().blueTeam.teamMembers].some(
        (player) =>
            player.moves.some(
                (i) =>
                    i.count > 0 &&
                    moves.find((j) => j.id === i.moveId)?.isFinish
            )
    );

/** taps every red cup still standing with a normal hit from `playerId` */
function clearTable(team: CupTeam, playerId: string) {
    for (const cup of standingCups(draft().cupHits, team)) {
        hit(team, cup, playerId, normal);
    }
}

beforeEach(() => {
    actions().clear();
    // anna and ben play red, carl and dora blue
    actions().setTeams(
        [{ id: 'anna' }, { id: 'ben' }],
        [{ id: 'carl' }, { id: 'dora' }]
    );
});

describe('pro mode cups', () => {
    it('a hit counts its move and takes the cup, even for a move never entered before', () => {
        hit('red', { x: 3, y: 6 }, 'carl', normal);

        expect(count('carl', 'normal')).toBe(1);
        expect(standing('red')).toBe(9);
        expect(standing('blue')).toBe(10);
    });

    it('a bouncer takes the tapped cup and the closest one', () => {
        hit('red', { x: 3, y: 6 }, 'carl', bouncer);

        expect(count('carl', 'bouncer')).toBe(1);
        expect(draft().cupHits[0].cups).toEqual([
            { x: 3, y: 6 },
            { x: 2, y: 4 },
        ]);
        expect(standing('red')).toBe(8);
    });

    it('a bomb is worth two points but takes one cup', () => {
        hit('blue', { x: 0, y: 0 }, 'anna', bomb);

        expect(standing('blue')).toBe(9);
    });

    it('a cup that is gone cannot be hit again', () => {
        hit('red', { x: 3, y: 6 }, 'carl', normal);

        expect(
            cupsTakenBy(draft().cupHits, 'red', { x: 3, y: 6 }, normal)
        ).toBeUndefined();
    });

    it('putting a cup back undoes its whole hit', () => {
        hit('red', { x: 3, y: 6 }, 'carl', bouncer);
        // the second cup the bouncer took
        actions().undoCupHit('red', { x: 2, y: 4 });

        expect(count('carl', 'bouncer')).toBe(0);
        expect(standing('red')).toBe(10);
    });

    it('lowering a count on the points page puts the latest hits back', () => {
        hit('red', { x: 3, y: 6 }, 'carl', normal);
        hit('red', { x: 2, y: 4 }, 'carl', normal);
        hit('red', { x: 4, y: 4 }, 'dora', normal);

        actions().setMoveCount('carl', 'normal', 1);

        expect(draft().cupHits.map((i) => i.cups[0])).toEqual([
            { x: 3, y: 6 },
            { x: 4, y: 4 },
        ]);
        // raising it again doesn't invent cups: the extra one is a points-only entry
        actions().setMoveCount('carl', 'normal', 5);
        expect(standing('red')).toBe(8);
    });

    it('a player who leaves or switches teams takes their hits with them', () => {
        hit('red', { x: 3, y: 6 }, 'carl', normal);
        hit('red', { x: 2, y: 4 }, 'dora', normal);

        actions().setPlayerTeam('carl', null);
        expect(standing('red')).toBe(9);

        actions().setPlayerTeam('dora', 'red');
        expect(standing('red')).toBe(10);
    });

    it('the hit that takes the last cup is also the finish', () => {
        clearTable('red', 'carl');

        expect(standing('red')).toBe(0);
        expect(count('carl', 'normal')).toBe(10);
        expect(count('carl', 'finish')).toBe(1);

        // putting the last cup back takes the finish with it
        actions().undoCupHit('red', draft().cupHits[9].cups[0]);
        expect(count('carl', 'normal')).toBe(9);
        expect(count('carl', 'finish')).toBe(0);
    });

    it('removing the finish on the points page keeps the cups gone', () => {
        clearTable('red', 'carl');
        actions().setMoveCount('carl', 'finish', 0);

        expect(standing('red')).toBe(0);
        expect(draft().cupHits[9].finishMoveId).toBeUndefined();
        // the cup's hit can still be undone without touching a finish that isn't there
        actions().undoCupHit('red', draft().cupHits[9].cups[0]);
        expect(count('carl', 'finish')).toBe(0);
        expect(count('carl', 'normal')).toBe(9);
    });

    it('offers only moves that fit the cups that are left', () => {
        const ids = (n: number) =>
            hittableMoves(moves, n, false).map((i) => i.id);

        expect(ids(10)).toEqual(['normal', 'bomb', 'bouncer']);
        // a ring finishes the cups it takes, so it needs exactly that many
        expect(ids(4)).toEqual(['normal', 'bomb', 'bouncer', 'ring-of-fire']);
        expect(ids(1)).toEqual(['normal', 'bomb']);
    });

    it('a ring of fire takes the last four cups and is the finish itself', () => {
        const cups = CUP_FORMATION.cups;
        for (const cup of cups.slice(0, 6)) hit('blue', cup, 'anna', normal);
        hit('blue', cups[6], 'ben', ringOfFire);

        expect(standing('blue')).toBe(0);
        expect(count('ben', 'ring-of-fire')).toBe(1);
        expect(count('ben', 'finish')).toBe(0);
    });

    it('starting a new match puts every cup back', () => {
        hit('red', { x: 3, y: 6 }, 'carl', normal);
        actions().clear();

        expect(draft().cupHits).toEqual([]);
    });

    it('tapping a cup on the far side of the table hits that same cup', () => {
        // the bottom team's pyramid is drawn turned around; a tap is turned back before it's stored
        for (const cup of CUP_FORMATION.cups) {
            const drawn = rotatePoint(CUP_FORMATION, cup);
            expect(rotatePoint(CUP_FORMATION, drawn)).toEqual(cup);
        }
        // the front cup is drawn at the top, nearest the other team
        expect(rotatePoint(CUP_FORMATION, { x: 3, y: 6 })).toEqual({
            x: 3,
            y: 0,
        });
    });

    it('the formation the draft starts from is never changed', () => {
        const before = JSON.stringify(CUP_FORMATION);
        clearTable('red', 'carl');
        actions().undoCupHit('red', { x: 3, y: 6 });

        expect(JSON.stringify(CUP_FORMATION)).toBe(before);
    });

    it('a last cup entered after a finish was already counted is just a hit', () => {
        actions().setMoveCount('carl', 'finish', 1);
        clearTable('red', 'dora');

        expect(count('dora', 'finish')).toBe(0);
        expect(count('carl', 'finish')).toBe(1);
    });

    it('with several finishes on top of the last cup, the scorer picks one', () => {
        const flipCup: CupMove = { id: 'flip', cups: 0, isFinish: true };

        expect(finishForHit(normal, 1, false, [...moves, flipCup])).toBe('ask');
        expect(finishForHit(normal, 2, false, [...moves, flipCup])).toEqual({});
    });

    it('a finish only stands while its team has no cups left', () => {
        clearTable('red', 'carl');
        // putting back any cup, not just the last one, takes the finish back
        actions().undoCupHit('red', { x: 0, y: 0 });

        expect(standing('red')).toBe(1);
        expect(count('carl', 'finish')).toBe(0);
        expect(draft().cupHits.some((i) => i.finishMoveId)).toBe(false);
    });

    it("lowering the last hit's move on the points page takes its finish too", () => {
        clearTable('red', 'carl');
        actions().setMoveCount('carl', 'normal', 9);

        expect(standing('red')).toBe(1);
        expect(count('carl', 'finish')).toBe(0);
    });

    it('a ring is not offered once the match has a finish', () => {
        const ids = hittableMoves(moves, 4, true).map((i) => i.id);

        expect(ids).toEqual(['normal', 'bomb', 'bouncer']);
    });

    it('a save takes no cup, so it is never a cup hit', () => {
        expect(cupsTakenBy([], 'red', { x: 3, y: 6 }, save)).toBeUndefined();
    });
});
