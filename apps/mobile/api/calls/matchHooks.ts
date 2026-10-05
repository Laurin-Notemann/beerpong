import {
    queryOptions,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
    CreatedMatch,
    createMatchKey,
    discardQueuedMatch,
    QueuedMatch,
    registerMatchQueue,
} from '@/api/calls/matchQueue';
import { env } from '@/api/env';
import { ApiId } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { compressImage, IMAGE_SIZES } from '@/api/utils/compressImage';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { uploadAsset } from '@/api/utils/uploadAsset';
import { Client, Paths, TeamPhotoDto } from '@/openapi/openapi';
import { describeError, showErrorToast, showSuccessToast } from '@/toast';
import { ScopedLogger } from '@/utils/logging';

export const matchesQueryOptions = (
    api: Promise<Client>,
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined
) =>
    queryOptions<Paths.GetAllMatchesExtended.Responses.$200 | null>({
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

export const useMatchesQuery = (
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery(matchesQueryOptions(api, groupId, seasonId));
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

/** Enters a new match; it's sent when the phone is online (see `matchQueue`). */
export const useCreateMatchMutation = () =>
    useMutation<CreatedMatch, unknown, QueuedMatch>({
        mutationKey: createMatchKey,
    });

const queueLogger = new ScopedLogger('match-queue');

/**
 * Registers how queued matches are sent (`registerMatchQueue`). Rendered inside `ApiProvider`,
 * it registers during the first render, before `PersistQueryClientProvider` restores the
 * persisted matches in an effect.
 */
export function MatchQueue() {
    const qc = useQueryClient();
    const { api } = useApi();

    useState(() =>
        registerMatchQueue(qc, {
            createMatch: async ({ id, groupId, seasonId, teams }) => {
                const res = await (
                    await api
                ).createMatch({ groupId, seasonId }, { id, teams });
                return res?.data;
            },
            onCreated: (match, created) => {
                if (match.photos) {
                    // not awaited: the next queued match is sent while the photos upload
                    uploadTeamPhotos(
                        api,
                        { ...match, matchId: match.id },
                        created?.data?.photoUploads ?? [],
                        match.photos
                    );
                } else {
                    showSuccessToast('Created match.');
                }
            },
            onRejected: (match, error) => {
                // keeps what was entered
                queueLogger.warn('the server rejected a match:', match, error);
                captureMutationErr('createMatch')(error);
                const time = env.format.date.matchHour(dayjs(match.enteredAt));
                Alert.alert(
                    'Match not saved',
                    `The match from ${time} couldn't be saved. ${describeError(error) ?? ''}`.trim()
                );
            },
        })
    );

    return null;
}

/** Tapping a match that isn't on the server yet says so, and offers to drop it. */
export function useExplainQueuedMatch() {
    const qc = useQueryClient();

    return (matchId: ApiId) =>
        Alert.alert(
            'Not synced yet',
            "This match is saved on your phone and is sent when you're back online.",
            [
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                        if (!discardQueuedMatch(qc, matchId)) {
                            showErrorToast("It's being sent right now.");
                        }
                    },
                },
                { text: 'OK', style: 'cancel' },
            ]
        );
}

/** after a match is created with `savePhoto`; says when it's done */
async function uploadTeamPhotos(
    api: Promise<Client>,
    match: { groupId: ApiId; seasonId: ApiId; matchId: ApiId },
    photoUploads: TeamPhotoDto[],
    photos: { blueTeamPhotoUri: string; redTeamPhotoUri: string }
) {
    // the upload urls are returned in the same order as the teams
    const [bluePhotoUpload, redPhotoUpload] = photoUploads;
    try {
        if (bluePhotoUpload && redPhotoUpload) {
            await uploadTeamPhoto(bluePhotoUpload, photos.blueTeamPhotoUri);
            await uploadTeamPhoto(redPhotoUpload, photos.redTeamPhotoUri);
        } else {
            // a repeated create returns the match without upload urls
            await attachTeamPhotos(api, match, photos);
        }
        showSuccessToast('Created match.');
    } catch (err) {
        queueLogger.error('failed to upload team photos:', err);
        showErrorToast(
            "Match created, but the team photos couldn't be uploaded.",
            err
        );
    }
}

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

    await uploadAsset(
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
