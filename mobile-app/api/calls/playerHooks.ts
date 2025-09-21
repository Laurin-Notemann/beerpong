import { useMutation, useQuery } from '@tanstack/react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { Paths } from '@/openapi/openapi';
import { ConsoleLogger } from '@/utils/logging';

export const usePlayersQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetPlayers.Responses.$200 | null>({
        queryKey: [
            QK.group,
            groupId ?? 'NULL',
            QK.season,
            seasonId ?? 'NULL',
            QK.players,
        ],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }

            const res = await (
                await api
            ).getPlayers({ groupId, seasonId, showInactive: true });

            return res?.data;
        },
    });
};

export const useCreatePlayerMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.CreateProfile.Responses.$200 | null,
        Error,
        Paths.CreateProfile.RequestBody & { groupId: ApiId; seasonId: ApiId }
    >({
        mutationFn: async (body) => {
            const res = await (await api).createProfile(body, body);
            return res?.data;
        },
    });
};

export const useUpdatePlayerMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.UpdateProfile.Responses.$200 | null,
        Error,
        Paths.UpdateProfile.RequestBody & {
            groupId: ApiId;
            seasonId: ApiId;
            id: ApiId;
        }
    >({
        mutationFn: async (body) => {
            const res = await (await api).updateProfile(body, body);
            return res?.data;
        },
    });
};

export const useUpdatePlayerAvatarMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.UpdateProfile.Responses.$200 | null,
        Error,
        {
            byteArray: Uint8Array<ArrayBuffer>;
            mimeType: string;

            groupId: ApiId;
            seasonId: ApiId;
            profileId: ApiId;
        }
    >({
        mutationFn: async (body) => {
            const { byteArray } = body;

            const res = await (
                await api
            )
                // the automatic type gen thinks the endpoint expects a string but it actually has to be a byte array 💀
                .setAvatar(
                    {
                        groupId: body.groupId,
                        id: body.profileId,
                    },
                    undefined
                );
            const singleUploadUrl =
                res?.data.data?.avatarAsset?.singleUploadUrl;

            if (!singleUploadUrl)
                throw new Error('No upload URL returned from server');

            const uploadRes = await fetch(singleUploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': body.mimeType,
                },
                body: byteArray,
            });
            if (!uploadRes.ok) {
                ConsoleLogger.error(
                    `Failed to upload: ${uploadRes.status} ${await uploadRes.text()}`
                );
            }
            return uploadRes;
        },
    });
};

export const useDeletePlayerMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.DeletePlayer.Responses.$200 | null,
        Error,
        { groupId: ApiId; seasonId: ApiId; id: ApiId }
    >({
        mutationFn: async (body) => {
            const res = await (await api).deletePlayer(body);
            return res?.data;
        },
    });
};

export const useDeletePlayerAvatarMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.SetAvatar.Responses.$200 | null,
        Error,
        { groupId: ApiId; seasonId: ApiId; profileId: ApiId }
    >({
        mutationFn: async () => {
            const res = await (await api).setAvatar();
            return res?.data;
        },
    });
};
