import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { Paths } from '@/openapi/openapi';
import {useQuery} from "@tanstack/react-query";

export const useProfilesQuery = (
    groupId: ApiId | null
) => {
    const { api } = useApi();

    return useQuery<Paths.ListAllProfiles.Responses.$200 | null>({
        queryKey: [
            QK.group,
            groupId,
            QK.profiles,
        ],
        queryFn: async () => {
            if (!groupId) {
                return null;
            }

            const res = await (
                await api
            ).listAllProfiles({ groupId });

            return res?.data;
        },
    });
};