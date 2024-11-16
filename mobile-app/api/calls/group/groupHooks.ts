import { useMutation, useQuery } from 'react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Paths } from '@/openapi/openapi';

// Type definitions
export type Group = NonNullable<Paths.GetGroupById.Responses.$200['data']>;

export const useGroupQuery = (id: ApiId) => {
    const { api } = useApi();

    return useQuery<Paths.GetGroupById.Responses.$200 | undefined>(
        ['group', id],
        async () => {
            const res = await (await api).getGroupById(id);
            return res?.data;
        }
    );
};

export const useGroupsQuery = () => {
    const { api } = useApi();

    return useQuery<Paths.GetAllGroups.Responses.$200 | undefined>(
        'groups',
        async () => {
            const res = await (await api).getAllGroups();
            return res?.data;
        }
    );
};

export const useCreateGroupMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.CreateGroup.Responses.$200 | undefined,
        Error,
        Paths.CreateGroup.RequestBody
    >(async (body) => {
        const res = await (await api).createGroup(null, body);
        return res?.data;
    });
};

export const useUpdateGroupMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.UpdateGroup.Responses.$200 | undefined,
        Error,
        Paths.UpdateGroup.RequestBody
    >(async (body) => {
        const res = await (await api).updateGroup(null, body);
        return res?.data;
    });
};
