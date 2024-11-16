import { useMutation, useQuery } from 'react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Paths } from '@/openapi/openapi';

export const useGroupQuery = (id: ApiId) => {
    const { api } = useApi();

    return useQuery<Paths.GetGroupById.Responses.$200 | undefined>(['group', id], async () => {
        if (!api) throw new Error('API not initialized');

        const res = await api.getGroupById(id);
        return res?.data;
    });
};

export const useGroupsQuery = () => {
    const { api } = useApi();

    return useQuery<Paths.GetAllGroups.Responses.$200 | undefined>('groups', async () => {
        if (!api) throw new Error('API not initialized');

        const res = await api.getAllGroups();
        return res?.data;
    });
}

export const useCreateGroupMutation = () => {
    const { api } = useApi();
    return useMutation<Paths.CreateGroup.Responses.$200 | undefined, Error, Paths.CreateGroup.RequestBody>(
        async (body) => {
            if (!api) throw new Error('API not initialized');

            const res = await api.createGroup(null, body);
            return res?.data;
        },
    );
}

export const useUpdateGroupMutation = () => {
    const { api } = useApi();
    return useMutation<Paths.UpdateGroup.Responses.$200 | undefined, Error, Paths.UpdateGroup.RequestBody>(
        async (body) => {
            if (!api) throw new Error('API not initialized');

            const res = await api.updateGroup(null, body);
            return res?.data;
        },
    );
}
