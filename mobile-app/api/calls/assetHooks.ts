import { useQuery } from '@tanstack/react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Paths } from '@/openapi/openapi';

export const useAssetQuery = (assetId: ApiId | null | undefined) => {
    const { api } = useApi();

    return useQuery<Paths.GetAsset.Responses.$200 | null>({
        queryKey: ['asset', assetId ?? 'NULL'],
        queryFn: async () => {
            if (!assetId) {
                return null;
            }
            const res = await (await api).getAsset(assetId);
            return res?.data;
        },
        enabled: !!assetId,
    });
};
