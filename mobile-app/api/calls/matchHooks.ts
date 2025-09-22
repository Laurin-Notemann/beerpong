import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { Paths } from '@/openapi/openapi';
import { ConsoleLogger } from '@/utils/logging';
import { useLogging } from '@/utils/useLogging';

export const useMatchQuery = (
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined,
    matchId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetMatchById.Responses.$200 | null>({
        queryKey: [QK.group, groupId, QK.season, seasonId, QK.matches, matchId],
        queryFn: async () => {
            if (!groupId || !seasonId || !matchId) {
                return null;
            }
            const res = await (
                await api
            ).getMatchById({ groupId, seasonId, id: matchId });

            return res?.data;
        },
    });
};

export const useMatchesQuery = (
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllMatches.Responses.$200 | null>({
        queryKey: [QK.group, groupId, QK.season, seasonId, QK.matches],
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }
            const res = await (await api).getAllMatches({ groupId, seasonId });

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
    });
};

export const useUpdateMatchMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.UpdateMatch.Responses.$200 | null,
        Error,
        Paths.UpdateMatch.RequestBody & {
            groupId: ApiId;
            seasonId: ApiId;
            id: ApiId;
        }
    >({
        mutationFn: async (body) => {
            const res = await (await api).updateMatch(body, body);
            return res?.data;
        },
    });
};

export const useUpdateMatchPhotoMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.SetPhoto.Responses.$200 | null,
        Error,
        {
            byteArray: Uint8Array<ArrayBuffer>;
            mimeType: string;

            groupId: ApiId;
            seasonId: ApiId;
            matchId: ApiId;
            teamId: ApiId;
        }
    >({
        mutationFn: async (body) => {
            const { byteArray, mimeType } = body;

            const res = await (
                await api
            )
                // the automatic type gen thinks the endpoint expects a string but it actually has to be a byte array 💀
                .setPhoto(
                    {
                        groupId: body.groupId,
                        seasonId: body.seasonId,
                        id: body.matchId,
                        teamId: body.teamId,
                    },
                    undefined
                );
            // @ts-expect-error TODO: broken typegen for AssetUploadResponse
            const singleUploadUrl = res?.data.data?.photoAsset?.singleUploadUrl;

            if (!singleUploadUrl)
                throw new Error('No upload URL returned from server');

            const uploadRes = await fetch(singleUploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': mimeType,
                },
                body: byteArray,
            });
            if (!uploadRes.ok) {
                ConsoleLogger.error(
                    `Failed to upload: ${uploadRes.status} ${await uploadRes.text()}`
                );
                throw new Error(
                    'Failed to upload image with status ' + uploadRes.status
                );
            }
            return res.data;
        },
    });
};

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
            )
                // @ts-expect-error TODO: broken typegen for DeletePhoto
                .deletePhoto(groupId, seasonId, matchId, teamId);
            return res?.data;
        },
    });
};
