import { describe, expect, it } from 'vitest';

import type { Player } from '@/api/calls/seasonHooks';
import {
    liveScoresOf,
    toLeaderboardWidget,
    toLiveScore,
} from '@/lib/widgets/props';

const player = (name: string, elo: number, matches = 3): Player => ({
    id: name,
    profileId: name,
    name,
    elo,
    points: 0,
    matches,
    matchesWon: 0,
    cups: 0,
    avgTeamSize: 2,
});

const widget = (players: Player[], minMatchesToQualify = 0) =>
    toLeaderboardWidget({
        group: 'WG',
        season: 'Season 2',
        players,
        rankingAlgorithm: 'ELO',
        minMatchesToQualify,
    });

describe('toLeaderboardWidget', () => {
    it('ranks like the leaderboard, ties included', () => {
        const { metric, rows } = widget([
            player('Bo', 1100),
            player('Ali', 1200),
            player('Cleo', 1100),
        ]);

        expect(metric).toBe('Elo');
        expect(rows).toEqual([
            { rank: '1', name: 'Ali', value: '1200' },
            { rank: 'T2', name: 'Bo', value: '1100' },
            { rank: 'T2', name: 'Cleo', value: '1100' },
        ]);
    });

    it('leaves out players without matches or below the minimum', () => {
        const { rows } = widget(
            [
                player('Ali', 1200, 0),
                player('Bo', 1100, 2),
                player('Cleo', 900),
            ],
            3
        );

        expect(rows.map((i) => i.name)).toEqual(['Cleo']);
    });

    it('shows at most ten players', () => {
        const players = Array.from({ length: 14 }, (_, i) =>
            player(`P${i}`, 1000 + i)
        );

        expect(widget(players).rows).toHaveLength(10);
    });
});

describe('toLiveScore', () => {
    const team = (names: string[], score: number) => ({
        players: names.map((name) => ({ id: name, name })),
        score,
    });

    it('says how many more players a team has than its names show', () => {
        expect(
            toLiveScore({
                blue: team(['Anna', 'Ben', 'Cleo', 'Dan'], 3),
                red: team(['Eve'], 5),
            })
        ).toEqual({
            blueNames: 'Anna, Ben +2',
            blueScore: 3,
            redNames: 'Eve',
            redScore: 5,
        });
    });
});

describe('liveScoresOf', () => {
    const match = {
        id: 'm1',
        blueNames: 'Anna',
        blueScore: 1,
        redNames: 'Eve',
        redScore: 0,
        startedAt: 1,
    };

    it("reads the API's widget push and drops malformed matches", () => {
        expect(
            liveScoresOf({
                liveScores: {
                    groupId: 'g1',
                    matches: [match, { id: 'm2', blueNames: 'Ben' }],
                },
            })
        ).toEqual({ groupId: 'g1', matches: [match] });
    });

    it('ignores other pushes', () => {
        expect(liveScoresOf({ other: true })).toBeUndefined();
        expect(liveScoresOf(null)).toBeUndefined();
    });
});
