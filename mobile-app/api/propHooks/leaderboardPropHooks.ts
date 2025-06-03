import {
    LeaderboardScope,
    useGetLeaderboardQuery,
} from '@/api/calls/leaderboardHooks';
import { Player, toPlayer } from '@/api/calls/seasonHooks';
import { ApiId } from '@/api/types';

export interface LeaderboardProps {
    players: Player[];
}

export const useLeaderboardProps = (
    groupId: ApiId | null,
    seasonId: ApiId | null
) => {
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

    return {
        rawCurrentSeasonPlayers:
            seasonLeaderboardQuery.data?.data?.entries ?? [],
        currentSeasonPlayers,
        alltimePlayers,
        dailyPlayers,
        dailyLeaderboard: {
            numMatches: dailyLeaderboardQuery.data?.data?.numMatches ?? 0,
            numPlayers: dailyLeaderboardQuery.data?.data?.numPlayers ?? 0,
            startDate: dailyLeaderboardQuery.data?.data?.startedAt!,
        },
        currentSeasonLeaderboard: {
            numMatches: seasonLeaderboardQuery.data?.data?.numMatches ?? 0,
            numPlayers: seasonLeaderboardQuery.data?.data?.numPlayers ?? 0,
            startDate: seasonLeaderboardQuery.data?.data?.startedAt!,
        },
        alltimeLeaderboard: {
            numMatches: alltimeLeaderboardQuery.data?.data?.numMatches ?? 0,
            numPlayers: alltimeLeaderboardQuery.data?.data?.numPlayers ?? 0,
            startDate: alltimeLeaderboardQuery.data?.data?.startedAt!,
        },
    };
};

/**
 * usage: `players.sort(byAveragePoints)`
 */
export const byDescendingAveragePoints = (a: Player, b: Player) =>
    (b.matches ? b.points / b.matches : 0) -
    (a.matches ? a.points / a.matches : 0);

export const byDescendingElo = (a: Player, b: Player) => b.elo - a.elo;
