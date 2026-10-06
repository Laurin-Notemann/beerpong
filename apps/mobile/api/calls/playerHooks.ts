import {
    QueryClient,
    queryOptions,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import { fetchProfiles, withProfiles } from '@/api/calls/profileHooks';
import { ApiId, WithProfile } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { uploadAsset } from '@/api/utils/uploadAsset';
import { Client, Paths, PlayerDto } from '@/openapi/openapi';
import { readAsByteArray } from '@/utils/fileUpload';

/**
 * Uploads a profile's new avatar or score clip. The API points the profile at the new asset before
 * the bytes arrive, so a failed upload takes it off again with `remove`: otherwise the profile
 * keeps an asset with nothing behind it (Versus TV shows an empty clip). The upload's error is
 * thrown either way, for the toast and Sentry.
 */
async function uploadOrRemove(
    upload: () => Promise<void>,
    remove: () => Promise<unknown>
) {
    try {
        await upload();
    } catch (err) {
        await remove().catch(() => {});
        throw err;
    }
}

/** every player of the season, inactive (deleted) ones too: they still appear in matches */
export const playersQueryOptions = (
    api: Promise<Client>,
    qc: QueryClient,
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) =>
    queryOptions<
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
        enabled: !!groupId && !!seasonId,
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

export const usePlayersQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    const qc = useQueryClient();

    return useQuery(playersQueryOptions(api, qc, groupId, seasonId));
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
            byteArray: Uint8Array<ArrayBuffer | ArrayBufferLike>;
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
            await uploadOrRemove(
                () =>
                    uploadAsset(
                        res.data.data?.singleUploadUrl ?? '',
                        byteArray,
                        'profilePicture',
                        mimeType
                    ),
                async () => (await api).deleteAvatar({ groupId, id: profileId })
            );
            return res.data;
        },
        onError: captureMutationErr('updateAvatar'),
    });
};

/**
 * Adds a score clip (an H.264 MP4) next to the player's others; Versus TV and the app play one of
 * them at random when the player scores
 */
export const useAddScoreClipMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.AddScoreClip.Responses.$200 | null,
        Error,
        {
            /** the picked video's file */
            uri: string;
            groupId: ApiId;
            profileId: ApiId;
        }
    >({
        mutationFn: async ({ uri, groupId, profileId }) => {
            // read first: a file that can't be read doesn't add a clip
            const byteArray = await readAsByteArray(uri);
            const res = await (
                await api
            ).addScoreClip({
                groupId,
                id: profileId,
            });
            const assetId = res.data.data?.id ?? '';
            await uploadOrRemove(
                () =>
                    uploadAsset(
                        res.data.data?.singleUploadUrl ?? '',
                        byteArray,
                        'scoreClip',
                        'video/mp4'
                    ),
                async () =>
                    (await api).removeScoreClip({
                        groupId,
                        id: profileId,
                        assetId,
                    })
            );
            return res.data;
        },
        onError: captureMutationErr('addScoreClip'),
    });
};

/** removes one of the player's score clips */
export const useRemoveScoreClipMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.RemoveScoreClip.Responses.$200 | null,
        Error,
        { groupId: ApiId; profileId: ApiId; assetId: string }
    >({
        mutationFn: async ({ groupId, profileId, assetId }) => {
            const res = await (
                await api
            ).removeScoreClip({ groupId, id: profileId, assetId });
            return res?.data;
        },
        onError: captureMutationErr('removeScoreClip'),
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
