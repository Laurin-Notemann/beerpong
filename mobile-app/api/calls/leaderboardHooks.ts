import { useQuery } from '@tanstack/react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { Paths } from '@/openapi/openapi';

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
            scope,
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
