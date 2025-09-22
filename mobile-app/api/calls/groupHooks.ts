import { useMutation, useQuery } from '@tanstack/react-query';

import { ApiId } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { uploadImage } from '@/api/utils/uploadImage';
import { Paths } from '@/openapi/openapi';

export const useGroupPresetsQuery = () => {
    const { api } = useApi();

    return useQuery<Paths.GetPresets.Responses.$200 | null>({
        queryKey: [],
        queryFn: async () => {
            const res = await (await api).getPresets();
            return res?.data;
        },
    });
};

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

export const useJoinGroupMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.FindGroupByInviteCode.Responses.$200 | null,
        Error,
        string
    >({
        mutationFn: async (inviteCode) => {
            const res = await (await api).findGroupByInviteCode({ inviteCode });
            return res?.data;
        },
        onError: captureMutationErr('joinGroup'),
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
        onError: captureMutationErr('createGroup'),
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
        onError: captureMutationErr('updateGroup'),
    });
};

export const useUpdateGroupWallpaperMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.SetWallpaper.Responses.$200 | null,
        Error,
        {
            byteArray: Uint8Array<ArrayBuffer | ArrayBufferLike>;
            mimeType: string;
            groupId: ApiId;
        }
    >({
        mutationFn: async ({ byteArray, groupId, mimeType }) => {
            const res = await (await api).setWallpaper({ id: groupId });

            await uploadImage(
                // @ts-expect-error TODO: broken typegen for AssetUploadResponse
                res?.data.data?.singleUploadUrl,
                byteArray,
                'groupWallpaper',
                mimeType
            );
            return res.data;
        },
        onError: captureMutationErr('updateWallpaper'),
    });
};

export const useDeleteWallpaperMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.DeleteWallpaper.Responses.$200 | null,
        Error,
        { groupId: ApiId }
    >({
        mutationFn: async ({ groupId }) => {
            const res = await (await api).deleteWallpaper({ id: groupId });
            return res.data;
        },
        onError: captureMutationErr('deleteWallpaper'),
    });
};
