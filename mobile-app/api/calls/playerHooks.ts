import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchProfiles, withProfiles } from '@/api/calls/profileHooks';
import { ApiId, WithProfile } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { uploadImage } from '@/api/utils/uploadImage';
import { Paths, PlayerDto } from '@/openapi/openapi';

export const usePlayersQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    const qc = useQueryClient();

    return useQuery<
        | (Omit<Paths.GetPlayers.Responses.$200, 'data'> & {
              data?: WithProfile<PlayerDto>[];
          })
        | null
    >({
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

            const [res, profiles] = await Promise.all([
                (await api).getPlayers({
                    groupId,
                    seasonId,
                    showInactive: true,
                }),
                fetchProfiles(qc, api, groupId),
            ]);

            return {
                ...res.data,
                data: withProfiles(res.data.data ?? [], profiles),
            };
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
        onError: captureMutationErr('createPlayer'),
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
        onError: captureMutationErr('updatePlayer'),
    });
};

export const useUpdatePlayerAvatarMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.SetAvatar.Responses.$200 | null,
        Error,
        {
            byteArray: Uint8Array<ArrayBuffer>;
            mimeType: string;

            groupId: ApiId;
            seasonId: ApiId;
            profileId: ApiId;
        }
    >({
        mutationFn: async ({ byteArray, mimeType, groupId, profileId }) => {
            const res = await (
                await api
            ).setAvatar({
                groupId,
                id: profileId,
            });
            await uploadImage(
                res.data.data?.singleUploadUrl ?? '',
                byteArray,
                'profilePicture',
                mimeType
            );
            return res.data;
        },
        onError: captureMutationErr('updateAvatar'),
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
        onError: captureMutationErr('deletePlayer'),
    });
};

export const useDeletePlayerAvatarMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.DeleteAvatar.Responses.$200 | null,
        Error,
        { groupId: ApiId; profileId: ApiId }
    >({
        mutationFn: async ({ groupId, profileId }) => {
            const res = await (
                await api
            ).deleteAvatar({ groupId, id: profileId });
            return res?.data;
        },
        onError: captureMutationErr('deleteAvatar'),
    });
};
