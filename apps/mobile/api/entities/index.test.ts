import { describe, expect, it } from 'vitest';

import { MatchImpl } from '@/api/entities';

const ruleMoves = [
    {
        id: 'cup',
        name: 'Cup',
        finishingMove: false,
        pointsForScorer: 1,
        pointsForTeam: 0,
    },
    {
        id: 'finish',
        name: 'Finish',
        finishingMove: true,
        pointsForScorer: 1,
        pointsForTeam: 2,
    },
];

const players = [
    { id: 'p1', profileId: 'a' },
    { id: 'p2', profileId: 'b' },
];

const match = (
    matchMoves: { teamMemberId: string; moveId: string; value: number }[]
) => ({
    id: 'm1',
    seasonId: 's1',
    date: '2026-10-03T16:59:21Z',
    teams: [
        { id: 'blue', matchId: 'm1' },
        { id: 'red', matchId: 'm1' },
    ],
    teamMembers: [
        { id: 'tm1', teamId: 'blue', playerId: 'p1' },
        { id: 'tm2', teamId: 'red', playerId: 'p2' },
    ],
    matchMoves,
});

describe('MatchImpl', () => {
    it('leaves out a move whose rule move is unknown instead of crashing (MOBILE-K)', () => {
        const result = new MatchImpl(
            match([
                { teamMemberId: 'tm1', moveId: 'cup', value: 3 },
                { teamMemberId: 'tm1', moveId: 'finish', value: 1 },
                { teamMemberId: 'tm2', moveId: 'removed-move', value: 5 },
            ]),
            players,
            ruleMoves
        ).toJSON();

        expect(result.blueTeam[0].points).toBe(4 + 2);
        expect(result.redTeam[0].points).toBe(0);
        expect(result.winnerTeamId).toBe('blue');
    });

    it('converts a match before the rule moves are known, without moves', () => {
        const result = new MatchImpl(
            match([{ teamMemberId: 'tm1', moveId: 'cup', value: 3 }]),
            players,
            []
        ).toJSON();

        expect(result.blueTeam[0].moves).toEqual([]);
        expect(result.blueTeam[0].points).toBe(0);
    });
});
