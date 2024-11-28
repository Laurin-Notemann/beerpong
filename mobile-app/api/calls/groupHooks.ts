import { useMutation, useQuery } from '@tanstack/react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Paths } from '@/openapi/openapi';

import { env } from '../env';
import { QK } from '../utils/reactQuery';

export const useGroupQuery = (id: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetGroupById.Responses.$200 | null>({
        queryKey: [QK.group, id],
        queryFn: async () => {
            if (!id) {
                return null;
            }
            const res = await (await api).getGroupById(id);
            return res?.data;
        },
    });
};

export const useFindGroupByInviteCode = (inviteCode: string | null) => {
    const { api } = useApi();

    return useQuery<Paths.FindGroupByInviteCode.Responses.$200 | null>({
        queryKey: [QK.groupCode, inviteCode],
        queryFn: async () => {
            if (!inviteCode || inviteCode.length < env.groupCode.length) {
                return null;
            }

            const res = await (await api).findGroupByInviteCode({ inviteCode });
            return res?.data;
        },
    });
};

export const useCreateGroupMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.CreateGroup.Responses.$200 | null,
        Error,
        Paths.CreateGroup.RequestBody
    >({
        mutationFn: async (body) => {
            const res = await (await api).createGroup(null, body);
            return res?.data;
        },
    });
};

export const useUpdateGroupMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.UpdateGroup.Responses.$200 | null,
        Error,
        Paths.UpdateGroup.RequestBody & { id: ApiId }
    >({
        mutationFn: async (body) => {
            const res = await (await api).updateGroup(body, body);
            return res?.data;
        },
    });
};

export const useUpdateGroupWallpaperMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.UpdateProfile.Responses.$200 | null,
        Error,
        {
            byteArray: Uint8Array<ArrayBuffer>;
            mimeType: string;

            groupId: ApiId;
        }
    >({
        mutationFn: async (body) => {
            const { byteArray, mimeType, ...rest } = body;

            const res = await (
                await api
            )
                // the automatic type gen thinks the endpoint expects a string but it actually has to be a byte array 💀
                .setWallpaper(rest, byteArray as any, {
                    headers: {
                        'Content-Type': mimeType,
                    },
                });
            return res?.data;
        },
    });
};
