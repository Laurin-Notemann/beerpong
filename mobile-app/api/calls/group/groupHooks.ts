import { useMutation, useQuery } from 'react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Paths } from '@/openapi/openapi';

// Type definitions
export type Group = NonNullable<Paths.GetGroupById.Responses.$200['data']>;

export const useGroupQuery = (id: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetGroupById.Responses.$200 | undefined>(
        ['group', 'id', id],
        async () => {
            if (!id) {
                console.log('No group id provided');
                return undefined;
            }
            console.log('Fetching group with id', id);
            const res = await (await api).getGroupById(id);
            return res?.data;
        }
    );
};

export const useFindGroupByInviteCode = (inviteCode: string | null) => {
    const { api } = useApi();

    return useQuery<Paths.FindGroupByInviteCode.Responses.$200 | undefined>(
        ['group', 'inviteCode', inviteCode],
        async () => {
            if (!inviteCode || inviteCode.length !== 9) {
                console.log('No invite code provided or invalid');
                return undefined;
            }

            console.log('Fetching group with invite code', inviteCode);
            const res = await (
                await api
            ).findGroupByInviteCode({ inviteCode });
            console.log('Response:', res?.data);
            return res?.data;
        }
    );
};
//B0W2QU4E7

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
