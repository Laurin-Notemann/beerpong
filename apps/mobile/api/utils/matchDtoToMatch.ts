import { MatchImpl, PlayerWithProfile } from '@/api/entities';
import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import { eloAlgorithm } from '@/lib/EloAlgorithm';
import { Components } from '@/openapi/openapi';

export interface PerformedMove {
    id: string;
    title: string;
    points: number;
    count: number;
    pointsForTeam: number;
    isFinish: boolean;
    /** cups one hit of this move takes off the table */
    cups: number;
}

export interface TeamMember {
    id: string;
    profileId: string;
    team: TeamId;
    avatarUrl?: string | null;
    name: string;
    points: number;
    change: number;
    /** used by the local Elo preview */
    elo?: number;

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

    blueTeamPhotoAssetId?: string | null;
    redTeamPhotoAssetId?: string | null;
    /** has to be resolved from `blueTeamPhotoAssetId` */
    blueTeamPhotoUrl?: string | null;
    /** has to be resolved from `redTeamPhotoAssetId` */
    redTeamPhotoUrl?: string | null;
    /** entered on this phone and not on the server yet (`matchQueue`) */
    isQueued?: boolean;
};

const noPlayers: PlayerWithProfile[] = [];
const noMoves: Components.Schemas.RuleMoveDto[] = [];

// React Query keeps unchanged objects across refetches, so a match DTO converted once with the
// same players and moves can be reused instead of rebuilt on every render.
const converted = new WeakMap<
    Components.Schemas.MatchDtoExtended,
    {
        players: PlayerWithProfile[];
        moves: Components.Schemas.RuleMoveDto[];
        match: Match;
    }
>();

export const matchDtoToMatch =
    (
        players: PlayerWithProfile[] = noPlayers,
        allowedMoves: Components.Schemas.RuleMoveDto[] = noMoves
    ) =>
    (dto: Components.Schemas.MatchDtoExtended): Match => {
        const hit = converted.get(dto);
        if (hit && hit.players === players && hit.moves === allowedMoves) {
            return hit.match;
        }
        const match = new MatchImpl(dto, players, allowedMoves).toJSON();
        converted.set(dto, { players, moves: allowedMoves, match });
        return match;
    };

export type MinimalMatch = Pick<
    Match,
    'id' | 'date' | 'blueCups' | 'redCups' | 'redTeam' | 'blueTeam'
>;

export const getInfluenceOfMatchOnAveragePoints = (
    matches: MinimalMatch[],
    playerId: string,
    matchId: string,
    rankingAlgorithm: 'AVERAGE' | 'ELO' | null = 'AVERAGE'
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
                player.elo =
                    ratings[player.id] ?? eloAlgorithm.params.startingElo;
                if (!ratings[player.id]) {
                    ratings[player.id] = player.elo;
                }
            }

            const previousElo =
                match.blueTeam
                    .concat(match.redTeam)
                    .find((p) => p.id === playerId)?.elo ??
                eloAlgorithm.params.startingElo;

            // eloAlgorithm.calculateElo(match);

            // Persist updated Elo back into running ratings for subsequent matches
            for (const player of match.blueTeam.concat(match.redTeam)) {
                ratings[player.id] = player.elo ?? ratings[player.id];
            }

            if (match.id === matchId) {
                const newElo =
                    match.blueTeam
                        .concat(match.redTeam)
                        .find((p) => p.id === playerId)?.elo ?? 0;

                return newElo - previousElo;
            }
        }
        return 0;
    }
    throw new Error('Unsupported ranking algorithm: ' + rankingAlgorithm);
};
