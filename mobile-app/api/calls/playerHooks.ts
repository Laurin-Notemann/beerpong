import { useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';

export const usePlayersQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null
) => {
    const { api } = useApi();

    return useQuery<Paths.GetPlayers.Responses.$200 | undefined>({
        queryKey: ['group', groupId, 'season', seasonId],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return undefined;
            }
            const res = await (await api).getPlayers({ groupId, seasonId });

            return res?.data;
        },
    });
};
