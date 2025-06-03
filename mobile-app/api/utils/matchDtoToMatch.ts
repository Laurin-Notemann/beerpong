import { MatchImpl } from '@/api/entities';
import { eloAlgorithm } from '@/app/EloAlgorithm';
import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { Components } from '@/openapi/openapi';

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
    matches: Omit<Match, 'winnerTeamId'>[],
    playerId: string,
    matchId: string,
    rankingAlgorithm: 'AVERAGE' | 'ELO' = 'AVERAGE'
) => {
    if (rankingAlgorithm === 'AVERAGE') {
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

        const previousAverage =
            pointsFromPreviousMatches / matchesBefore.length;

        const pointsThisMatch = player.points;

        const newAverage =
            (pointsFromPreviousMatches + pointsThisMatch) /
            (matchesBefore.length + 1);

        const changeInAverage = newAverage - previousAverage;

        // to avoid accidentally returning NaN due to division by zero
        return matchesBefore.length > 0 ? changeInAverage : newAverage;
    }
    if (rankingAlgorithm === 'ELO') {
        const sortedMatches = [...matches].sort(
            (a, b) => a.date.getTime() - b.date.getTime()
        );
        let ratings: Record<string, number> = {};

        for (const match of sortedMatches) {
            for (const player of match.blueTeam.concat(match.redTeam)) {
                // @ts-expect-error
                player.elo =
                    ratings[player.id] ?? eloAlgorithm.params.startingElo;
                if (!ratings[player.id]) {
                    // @ts-expect-error
                    ratings[player.id] = player.elo;
                }
            }

            const previousElo =
                match.blueTeam
                    .concat(match.redTeam)
                    // @ts-expect-error
                    .find((p) => p.id === playerId)?.elo ??
                eloAlgorithm.params.startingElo;

            // @ts-expect-error
            eloAlgorithm.calculateElo(match);

            if (match.id === matchId) {
                const newElo =
                    match.blueTeam
                        .concat(match.redTeam)
                        // @ts-expect-error
                        .find((p) => p.id === playerId)?.elo ?? 0;

                return previousElo - newElo;
            }
        }
        return 0;
    }
    throw new Error('Unsupported ranking algorithm: ' + rankingAlgorithm);
};
