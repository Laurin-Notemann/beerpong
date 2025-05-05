import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { Components } from '@/openapi/openapi';

import { MatchImpl } from '../entities';

export interface PerformedMove {
    id: string;
    title: string;
    points: number;
    count: number;
    pointsForTeam: number;
    isFinish: boolean;
}

export interface TeamMember {
    id: string;
    team: TeamId;
    avatarUrl?: string | null;
    name: string;
    points: number;
    change: number;

    moves: PerformedMove[];
}

export type Match = {
    id: string;
    date: Date;
    redCups: number;
    blueCups: number;
    redTeam: TeamMember[];
    blueTeam: TeamMember[];

    winnerTeamId: string | null;
};

export const matchDtoToMatch =
    (
        players: Components.Schemas.PlayerDto[] = [],
        allowedMoves: Components.Schemas.RuleMoveDto[] = []
    ) =>
    (i: Components.Schemas.MatchDto): Match => {
        return new MatchImpl(i, players, allowedMoves).toJSON();
    };

export const getInfluenceOfMatchOnAveragePoints = (
    matches: Match[],
    playerId: string,
    matchId: string
) => {
    const match = matches.find((i) => i.id === matchId);

    if (!match) {
        return 0;
    }
    const player = match.blueTeam
        .concat(match.redTeam)
        .find((i) => i.id === playerId);

    if (!player) {
        return 0;
    }

    const matchesBefore = matches
        .filter((i) => i.date < match.date)
        .filter(
            (i) =>
                i.blueTeam.find((k) => k.id === playerId) ||
                i.redTeam.find((k) => k.id === playerId)
        );

    const pointsFromPreviousMatches = matchesBefore.reduce((sum, i) => {
        const player = i.blueTeam
            .concat(i.redTeam)
            .find((k) => k.id === playerId);

        if (!player) {
            return sum;
        }
        return sum + player.points;
    }, 0);

    const previousAverage = pointsFromPreviousMatches / matchesBefore.length;

    const pointsThisMatch = player.points;

    const newAverage =
        (pointsFromPreviousMatches + pointsThisMatch) /
        (matchesBefore.length + 1);

    const changeInAverage = newAverage - previousAverage;

    // to avoid accidentally returning NaN due to division by zero
    return matchesBefore.length > 0 ? changeInAverage : newAverage;
};
