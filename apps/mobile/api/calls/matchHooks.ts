import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { ApiId } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { compressImage, IMAGE_SIZES } from '@/api/utils/compressImage';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { uploadImage } from '@/api/utils/uploadImage';
import { Client, Paths, TeamPhotoDto } from '@/openapi/openapi';
import { useLogging } from '@/utils/useLogging';

export const useMatchesQuery = (
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllMatchesExtended.Responses.$200 | null>({
        queryKey: [QK.group, groupId, QK.season, seasonId, QK.matches],
        enabled: !!groupId && !!seasonId,
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }
            const res = await (
                await api
            ).getAllMatchesExtended({ groupId, seasonId });

            return res?.data;
        },
    });
};

export const useMatchesByPlayerQuery = (
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined,
    playerId: ApiId | null | undefined
) => {
    const matchesQuery = useMatchesQuery(groupId, seasonId);

    if (!matchesQuery.data?.data) return matchesQuery;

    const matchesForPlayer = matchesQuery.data.data.filter((i) =>
        i.teamMembers!.find((j) => j.playerId === playerId)
    );

    return {
        ...matchesQuery,
        data: { data: matchesForPlayer },
    };
};

export const useCreateMatchMutation = () => {
    const { api } = useApi();

    const { writeLog } = useLogging();

    return useMutation<
        Paths.CreateMatch.Responses.$200 | null,
        Error,
        Paths.CreateMatch.RequestBody & { groupId: ApiId; seasonId: ApiId }
    >({
        mutationFn: async (body) => {
            try {
                const res = await (await api).createMatch(body, body);
                return res?.data;
            } catch (err) {
                writeLog('useCreateMatchMutation', body);
                Sentry.captureEvent({
                    message: 'Failed to create match',
                    level: 'error',
                    extra: {
                        body,
                        response: (err as AxiosError).response?.data,
                        status: (err as AxiosError).response?.status,
                    },
                });
                throw err;
            }
        },
        onError: captureMutationErr('createMatch'),
    });
};

export const useDeleteMatchMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.DeleteMatchById.Responses.$200 | null,
        Error,
        { groupId: ApiId; seasonId: ApiId; id: ApiId }
    >({
        mutationFn: async (body) => {
            const res = await (await api).deleteMatchById(body);
            return res?.data;
        },
        onError: captureMutationErr('deleteMatch'),
    });
};

export const useUpdateMatchMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.UpdateMatch.Responses.$200,
        Error,
        Paths.UpdateMatch.RequestBody & {
            groupId: ApiId;
            seasonId: ApiId;
            id: ApiId;
        }
    >({
        mutationFn: async (body) => {
            const res = await (await api).updateMatch(body, body);
            return res.data;
        },
        onError: captureMutationErr('updateMatch'),
    });
};

/**
 * creating/updating a match with `TeamCreateDto.savePhoto` returns upload urls for the team photos in `MatchDto.photoUploads`.
 * this uploads a team photo to such a url.
 */
export async function uploadTeamPhoto(
    photoUpload: Pick<TeamPhotoDto, 'teamPhoto'> | undefined,
    photoUri: string
): Promise<void> {
    const { byteArray, mimeType } = await compressImage(
        photoUri,
        IMAGE_SIZES.teamPhoto
    );

    await uploadImage(
        photoUpload?.teamPhoto?.singleUploadUrl ?? '',
        byteArray,
        'matchPhoto',
        mimeType
    );
}

export const useDeleteMatchPhotoMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.DeletePhoto.Responses.$200 | null,
        Error,
        { groupId: ApiId; seasonId: ApiId; matchId: ApiId; teamId: ApiId }
    >({
        mutationFn: async ({ groupId, seasonId, matchId, teamId }) => {
            const res = await (
                await api
            ).deletePhoto({
                groupId,
                seasonId,
                id: matchId,
                teamId,
            });
            return res.data;
        },
        onError: captureMutationErr('deleteMatchPhoto'),
    });
};

/**
 * Attaches a team photo (one picture per team) to a match that already exists: one entered
 * without a photo, or a finished live match.
 */
export async function attachTeamPhotos(
    api: Promise<Client>,
    match: { groupId: ApiId; seasonId: ApiId; matchId: ApiId },
    photos: { blueTeamPhotoUri: string; redTeamPhotoUri: string }
) {
    const client = await api;
    const { groupId, seasonId, matchId } = match;

    const res = await client.getMatchByIdExtended({
        groupId,
        seasonId,
        id: matchId,
    });
    // the teams in the order the match was created in: blue, then red
    const [blue, red] = res.data.data?.teams ?? [];
    if (!blue?.id || !red?.id) throw new Error(`match ${matchId} has no teams`);

    for (const [teamId, uri] of [
        [blue.id, photos.blueTeamPhotoUri],
        [red.id, photos.redTeamPhotoUri],
    ] as const) {
        const upload = await client.setPhoto({
            groupId,
            seasonId,
            id: matchId,
            teamId,
        });
        await uploadTeamPhoto({ teamPhoto: upload.data.data }, uri);
    }
}
