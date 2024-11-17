import { useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';

export const useMoves = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllRuleMoves.Responses.$200 | null>({
        queryKey: [
            'group',
            groupId ?? 'NULL',
            'season',
            seasonId ?? 'NULL',
            'ruleMoves',
        ],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }
            const res = await (
                await api
            ).getAllRuleMoves({ groupId, seasonId });

            return res?.data;
        },
    });
};
