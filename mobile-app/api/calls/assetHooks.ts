import { QueryClient, useQuery } from '@tanstack/react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { Client, Paths } from '@/openapi/openapi';
import { ConsoleLogger } from '@/utils/logging';

const assetQueryOptions = (api: Promise<Client>, assetId: ApiId) => ({
    queryKey: [QK.assets, assetId],
    queryFn: async (): Promise<Paths.GetAsset.Responses.$200> => {
        const res = await (await api).getAsset({ id: assetId });
        return res.data;
    },
    // the url of an asset is derived from its id, so it never changes
    staleTime: Infinity,
});

/**
 * DTOs only contain asset ids (e.g. `GroupDto.assetIdWallpaper`), this resolves the asset (and its url).
 */
export const useAssetQuery = (assetId: ApiId | null | undefined) => {
    const { api } = useApi();

    return useQuery<Paths.GetAsset.Responses.$200>({
        ...assetQueryOptions(api, assetId ?? 'NULL'),
        enabled: !!assetId,
    });
};

/**
 * like `useAssetQuery`, but for use inside of other query functions.
 *
 * @returns the url of the asset, or `null` if there is no asset or it can't be fetched
 */
export async function fetchAssetUrl(
    qc: QueryClient,
    api: Promise<Client>,
    assetId: ApiId | null | undefined
): Promise<string | null> {
    if (!assetId) return null;

    try {
        const res = await qc.fetchQuery(assetQueryOptions(api, assetId));
        return res.data?.url ?? null;
    } catch (err) {
        ConsoleLogger.error(`failed to fetch asset "${assetId}":`, err);
        return null;
    }
}
