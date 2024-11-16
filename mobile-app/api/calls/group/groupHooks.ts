import { useMutation, useQuery } from 'react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Paths } from '@/openapi/openapi';

export const useGroupQuery = (id: ApiId) => {
    const { getApi } = useApi();

    return useQuery<Paths.GetGroupById.Responses.$200 | undefined>(
        ['group', id],
        async () => {
            const res = await getApi().getGroupById(id);
            return res?.data;
        }
    );
};

export const useGroupsQuery = () => {
    const { getApi } = useApi();

    return useQuery<Paths.GetAllGroups.Responses.$200 | undefined>(
        'groups',
        async () => {
            const res = await getApi().getAllGroups();
            return res?.data;
        }
    );
};

export const useCreateGroupMutation = () => {
    const { getApi } = useApi();
    return useMutation<
        Paths.CreateGroup.Responses.$200 | undefined,
        Error,
        Paths.CreateGroup.RequestBody
    >(async (body) => {
        const res = await getApi().createGroup(null, body);
        return res?.data;
    });
};

export const useUpdateGroupMutation = () => {
    const { getApi } = useApi();
    return useMutation<
        Paths.UpdateGroup.Responses.$200 | undefined,
        Error,
        Paths.UpdateGroup.RequestBody
    >(async (body) => {
        const res = await getApi().updateGroup(null, body);
        return res?.data;
    });
};
