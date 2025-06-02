import {
    LeaderboardScope,
    useGetLeaderboardQuery,
} from '@/api/calls/leaderboardHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { Player, toPlayer } from '@/api/calls/seasonHooks';
import { ApiId } from '@/api/types';

export interface LeaderboardProps {
    players: Player[];
}

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
            .map(toPlayer) ?? [];

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
