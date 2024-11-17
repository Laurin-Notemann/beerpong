import { usePlayersQuery } from '../calls/playerHooks';
import { ApiId } from '../types';

export interface LeaderboardProps {
    players: Player[];
}

export interface Player {
    name: string;
    points: number;
    matches: number;
    matchesWon: number;
    elo: number;
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
            name: player.profile?.name ?? 'NO NAME FOUND',
            points: 11,
            matches: 12,
            matchesWon: 13,
            elo: 14,
        };
    });

    return {
        players,
    };
};
