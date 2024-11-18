import { useMutation, useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';

export const useMatchQuery = (
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined,
    matchId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetMatchById.Responses.$200 | null>({
        queryKey: ['group', groupId, 'season', seasonId, 'match', matchId],
        queryFn: async () => {
            if (!groupId || !seasonId || !matchId) {
                return null;
            }
            const res = await (
                await api
            ).getMatchById({ groupId, seasonId, id: matchId });

            return res?.data;
        },
    });
};

export const useMatchesQuery = (
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllMatches.Responses.$200 | null>({
        queryKey: ['group', groupId, 'season', seasonId],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }
            const res = await (await api).getAllMatches({ groupId, seasonId });

            return res?.data;
        },
    });
};

export const useCreateMatchMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.CreateMatch.Responses.$200 | null,
        Error,
        Paths.CreateMatch.RequestBody
    >({
        mutationFn: async (body) => {
            const res = await (await api).createMatch(null, body);
            return res?.data;
        },
    });
};
