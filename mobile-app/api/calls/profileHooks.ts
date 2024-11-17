import { useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';

export const useProfileQuery = (profileId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetProfileById.Responses.$200 | null>({
        queryKey: ['profile', profileId],
        queryFn: async () => {
            if (!profileId) {
                return null;
            }
            const res = await (await api).getProfileById(profileId);

            return res?.data;
        },
    });
};

export const useListAllProfilesQuery = (groupId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.ListAllProfiles.Responses.$200 | null>({
        queryKey: ['group', groupId, 'profiles'],
        queryFn: async () => {
            if (!groupId) {
                return null;
            }
            const res = await (await api).listAllProfiles({ groupId });

            return res?.data;
        },
    });
};
