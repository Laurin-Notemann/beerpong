import { useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';
import { QK } from '../utils/reactQuery';

export enum LeaderboardScope {
    TODAY = 'today',
    SEASON = 'season',
    ALL_TIME = 'all-time',
}

export const useGetLeaderboardQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined,
    scope: LeaderboardScope
) => {
    const { api } = useApi();

    return useQuery<Paths.GetLeaderboard.Responses.$200 | null>({
        queryKey: [
            QK.group,
            groupId ?? 'NULL',
            QK.season,
            seasonId ?? 'NULL',
            QK.players,
        ],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }

            const res = await (
                await api
            ).getLeaderboard({ groupId, seasonId, scope });

            return res?.data;
        },
    });
};
