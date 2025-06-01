import {
    LeaderboardScope,
    useGetLeaderboardQuery,
} from '@/api/calls/leaderboardHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { ApiId } from '@/api/types';
import { LeaderboardEntryDto } from '@/openapi/openapi';

export interface LeaderboardProps {
    players: Player[];
}

export interface Player {
    id: string;
    name: string;
    points: number;
    matches: number;
    matchesWon: number;
    elo: number;
    avatarUrl?: string | null;
}

const toPlayer = (i: LeaderboardEntryDto): Player => ({
    id: i.playerDto!.id!,
    elo: i.elo!,
    matches: i.totalGames!,
    points: i.totalPoints!,
    matchesWon: 10,
    name: i.playerDto!.profile!.name!,
    avatarUrl: i.playerDto!.profile!.avatarAsset?.url,
});

export const useLeaderboardProps = (
    groupId: ApiId | null,
    seasonId: ApiId | null
) => {
    const oldSeasonLeaderboardQuery = usePlayersQuery(groupId, seasonId);

    const dailyLeaderboardQuery = useGetLeaderboardQuery(
        groupId,
        seasonId,
        LeaderboardScope.TODAY
    );
    const seasonLeaderboardQuery = useGetLeaderboardQuery(
        groupId,
        seasonId,
        LeaderboardScope.SEASON
    );
    const alltimeLeaderboardQuery = useGetLeaderboardQuery(
        groupId,
        seasonId,
        LeaderboardScope.ALL_TIME
    );

    const dailyPlayers: Player[] =
        dailyLeaderboardQuery.data?.data?.entries!.map(toPlayer) ?? [];

    const currentSeasonPlayers: Player[] =
        seasonLeaderboardQuery.data?.data?.entries!.map(toPlayer) ?? [];

    const alltimePlayers: Player[] =
        alltimeLeaderboardQuery.data?.data?.entries!.map(toPlayer) ?? [];

    const oldCurrentSeasonPlayers: Player[] =
        oldSeasonLeaderboardQuery.data?.data
            ?.filter((i) => i.activeThisSeason)
            .map((player) => {
                return {
                    id: player.id!,
                    name: player.profile?.name ?? 'NO NAME FOUND',
                    points: player.statistics?.points ?? 0,
                    matches: player.statistics?.matches ?? 0,
                    matchesWon: player.statistics?.matches ?? 0,
                    elo: 14,
                    avatarUrl: player.profile?.avatarAsset?.url,
                };
            }) ?? [];

    return {
        currentSeasonPlayers: oldCurrentSeasonPlayers,
        alltimePlayers,
        dailyPlayers,
    };
};

/**
 * usage: `players.sort(byAveragePoints)`
 */
export const byDescendingAveragePoints = (a: Player, b: Player) =>
    (b.matches ? b.points / b.matches : 0) -
    (a.matches ? a.points / a.matches : 0);
