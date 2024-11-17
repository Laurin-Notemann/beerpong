import { useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';

export const useMatchQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null,
    matchId: ApiId | null
) => {
    const { api } = useApi();

    return useQuery<Paths.GetMatchById.Responses.$200 | undefined>({
        queryKey: ['group', groupId, 'season', seasonId, 'match', matchId],
        queryFn: async () => {
            if (!groupId || !seasonId || !matchId) {
                return undefined;
            }
            const res = await (await api).getMatchById({ groupId, seasonId, id: matchId });

            return res?.data;
        },
    });
}

export const useMatchesQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null
) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllMatches.Responses.$200 | undefined>({
        queryKey: ['group', groupId, 'season', seasonId],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return undefined;
            }
            const res = await (await api).getAllMatches({ groupId, seasonId });

            return res?.data;
        },
    });
};
