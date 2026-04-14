import { MatchImpl } from '@/api/entities';
import { eloAlgorithm } from '@/app/EloAlgorithm';
import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { Components } from '@/openapi/openapi';
import {profile} from "@expo/fingerprint/build/utils/Profile";

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
    profileId: string;
    playerId: string;
    team: TeamId;
    avatarUrl?: string | null;
    name: string;
    points: number;
    change: number;

    moves: PerformedMove[];
}

export type Match = {
    id: string;
    seasonId: string;
    date: Date;
    redCups: number;
    blueCups: number;
    blueTeamId: string;
    redTeamId: string;
    redTeam: TeamMember[];
    blueTeam: TeamMember[];

    winnerTeamId: string | null;

    blueTeamPhotoUrl?: string | null;
    redTeamPhotoUrl?: string | null;
};

export const matchDtoToMatch =
    (
        players: Components.Schemas.PlayerDto[] = [],
        profiles: Components.Schemas.ProfileDto[] = [],
        allowedMoves: Components.Schemas.RuleMoveDto[] = []
    ) =>
    (i: Components.Schemas.MatchDto): Match => {
        return new MatchImpl(i, players, profiles, allowedMoves).toJSON();
    };

export type MinimalMatch = Pick<
    Match,
    'id' | 'date' | 'blueCups' | 'redCups' | 'redTeam' | 'blueTeam'
>;

export const getInfluenceOfMatchOnAveragePoints = (
    matches: MinimalMatch[],
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
        const ratings: Record<string, number> = {};

        for (const match of sortedMatches) {
            for (const player of match.blueTeam.concat(match.redTeam)) {
                // @ts-expect-error TODO: type elo field
                player.elo =
                    ratings[player.id] ?? eloAlgorithm.params.startingElo;
                if (!ratings[player.id]) {
                    // @ts-expect-error TODO: type elo field
                    ratings[player.id] = player.elo;
                }
            }

            const previousElo =
                match.blueTeam
                    .concat(match.redTeam)
                    // @ts-expect-error TODO: type elo field
                    .find((p) => p.id === playerId)?.elo ??
                eloAlgorithm.params.startingElo;

            // eloAlgorithm.calculateElo(match);

            // Persist updated Elo back into running ratings for subsequent matches
            for (const player of match.blueTeam.concat(match.redTeam)) {
                // @ts-expect-error TODO: type elo field
                ratings[player.id] = player.elo ?? ratings[player.id];
            }

            if (match.id === matchId) {
                const newElo =
                    match.blueTeam
                        .concat(match.redTeam)
                        // @ts-expect-error TODO: type elo field
                        .find((p) => p.id === playerId)?.elo ?? 0;

                return newElo - previousElo;
            }
        }
        return 0;
    }
    throw new Error('Unsupported ranking algorithm: ' + rankingAlgorithm);
};
