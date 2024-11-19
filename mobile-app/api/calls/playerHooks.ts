import { useMutation, useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';

export const usePlayersQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetPlayers.Responses.$200 | null>({
        queryKey: [
            'group',
            groupId ?? 'NULL',
            'season',
            seasonId ?? 'NULL',
            'players',
        ],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }
            const res = await (await api).getPlayers({ groupId, seasonId });

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
            const { byteArray, mimeType, ...rest } = body;

            (await api).fetchData({ id: '' });

            const res = await (
                await api
            )
                // the automatic type gen thinks the endpoint expects a string but it actually has to be a byte array 💀
                .setAvatar(rest, byteArray as any, {
                    headers: {
                        'Content-Type': mimeType,
                    },
                });
            return res?.data;
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
