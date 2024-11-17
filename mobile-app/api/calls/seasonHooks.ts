import { useMutation, useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';

export const useSeasonQuery = (seasonId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetSeasonById.Responses.$200 | null>({
        queryKey: ['season', seasonId],
        queryFn: async () => {
            if (!seasonId) {
                return null;
            }
            const res = await (await api).getSeasonById(seasonId);

            return res?.data;
        },
    });
};

export const useAllSeasonQuery = (groupId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllSeasons.Responses.$200 | null>({
        queryKey: ['group', groupId, 'seasons'],
        queryFn: async () => {
            if (!groupId) {
                return null;
            }
            const res = await (await api).getAllSeasons(groupId);

            return res?.data;
        },
    });
};

export const useStartNewSeasonMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.StartNewSeason.Responses.$200 | null,
        Error,
        Paths.StartNewSeason.RequestBody
    >({
        mutationFn: async (body) => {
            const res = await (await api).startNewSeason(null, body);
            return res?.data;
        },
    });
};
