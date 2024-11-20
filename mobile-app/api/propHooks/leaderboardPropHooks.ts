import { usePlayersQuery } from '../calls/playerHooks';
import { ApiId } from '../types';

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

export const useLeaderboardProps = (
    groupId: ApiId | null,
    seasonId: ApiId | null
) => {
    const { data } = usePlayersQuery(groupId, seasonId);

    if (!data?.data) {
        return { players: [] };
    }

    const players: Player[] = data.data.map((player) => {
        return {
            id: player.id!,
            name: player.profile?.name ?? 'NO NAME FOUND',
            points: player.statistics?.points ?? 0,
            matches: player.statistics?.matches ?? 0,
            matchesWon: player.statistics?.matches ?? 0,
            elo: 14,
            avatarUrl: player.profile?.avatarAsset?.url,
        };
    });

    return {
        players,
    };
};
