import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { ApiId, WithProfile } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import {
    Paths,
    PlayerDtoExtended,
    SeasonListDto,
    SeasonSettingsDto,
} from '@/openapi/openapi';
import { useSelectedGroupId } from '@/zustand/group/stateGroupStore';

export const useSeasonQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null
) => {
    const { api } = useApi();

    return useQuery<Paths.GetSeasonById.Responses.$200 | null>({
        // TODO: this won't get refetched by the realtime event because we don't have access to the group id here
        queryKey: [QK.group, groupId, QK.seasons, seasonId],
        queryFn: async () => {
            if (!seasonId) {
                return null;
            }
            const res = await (
                await api
            ).getSeasonById({
                groupId: groupId!,
                id: seasonId!,
            });

            return res?.data;
        },
    });
};

/**
 * The group's seasons. What a season shows (matches, players, leaderboard) loads separately,
 * when a screen shows it (`useSeasonMatches`, `useSeasonLeaderboards`).
 */
export const useAllSeasonsQuery = (groupId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllSeasons.Responses.$200 | null>({
        queryKey: [QK.group, groupId, QK.seasons],
        queryFn: async () => {
            if (!groupId) {
                return null;
            }
            const res = await (await api).getAllSeasons(groupId);
            return res.data;
        },
    });
};

/**
 * Ended seasons that had matches, the ones the past seasons screens show. `numMatches` is
 * missing from an API older than this app; those seasons count as having matches.
 */
export const getPastSeasons = (seasons: SeasonListDto[] | null | undefined) =>
    seasons?.filter((i) => i.endDate != null && (i.numMatches ?? 1) > 0) ?? [];

export const useStartNewSeasonMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.StartNewSeason.Responses.$200 | null,
        Error,
        Paths.StartNewSeason.RequestBody & { groupId: string }
    >({
        mutationFn: async (body) => {
            const res = await (await api).startNewSeason(body, body);
            return res?.data;
        },
        onError: captureMutationErr('startNewSeason'),
    });
};

/**
 * returns information about the group we're currently in
 *
 * mainly used for getting `groupId` and `seasonId` since we need these for so many queries
 */
export const useGroup = () => {
    const selectedGroupId = useSelectedGroupId();

    const { data: groupQueryData } = useGroupQuery(selectedGroupId);

    const seasonId = groupQueryData?.data?.activeSeasonId;

    const { data: activeSeasonQueryData } = useSeasonQuery(
        selectedGroupId,
        seasonId ?? null
    );

    return {
        groupId: selectedGroupId,
        seasonId,
        group: groupQueryData,
        activeSeason: activeSeasonQueryData?.data,
    };
};

export const useSetSeasonSettingsMutations = () => {
    const { api } = useApi();
    return useMutation<
        Paths.UpdateSeasonById.Responses.$200 | null,
        Error,
        Paths.UpdateSeasonById.RequestBody &
            Paths.UpdateSeasonById.PathParameters
    >({
        mutationFn: async (body) => {
            const { groupId, id, ...rest } = body;
            const res = await (
                await api
            ).updateSeasonById({ groupId, id }, rest);
            return res?.data;
        },
        onError: captureMutationErr('updateSeasonSettings'),
    });
};

export function useSeasonSettings(groupId: ApiId, seasonId: ApiId) {
    const settingsMutation = useSetSeasonSettingsMutations();

    const qc = useQueryClient();

    const seasonQuery = useSeasonQuery(groupId, seasonId);

    const seasonSettings = seasonQuery.data?.data?.seasonSettings as
        Required<SeasonSettingsDto> | undefined;

    const updateSeasonSettingsMutation = useMutation({
        mutationFn: async (partialUpdate: SeasonSettingsDto) => {
            if (!groupId || !seasonId || !seasonSettings) return;

            qc.setQueryData<Paths.GetSeasonById.Responses.$200 | null>(
                [QK.group, groupId, QK.seasons, seasonId],
                (prev) =>
                    prev && {
                        ...prev,
                        data: {
                            ...prev.data,
                            seasonSettings: {
                                ...seasonSettings,
                                ...partialUpdate,
                            },
                        },
                    }
            );
            await settingsMutation.mutateAsync({
                groupId,
                id: seasonId,
                seasonSettings: {
                    ...seasonSettings,
                    ...partialUpdate,
                },
            });

            await qc.invalidateQueries({
                queryKey: [QK.group, groupId],
            });
            await qc.invalidateQueries({
                queryKey: [QK.group, groupId, QK.seasons, seasonId],
            });
        },
    });

    return {
        seasonQuery,
        seasonSettings,
        updateSeasonSettingsMutation,
    };
}

export interface Player {
    id: string;
    name: string;
    points: number;
    matches: number;
    matchesWon: number;
    elo: number;
    avatarUrl?: string | null;
    profileId: string;
    cups: number;
    avgTeamSize: number;
}

export const toPlayer = (i: WithProfile<PlayerDtoExtended>): Player => {
    return {
        id: i!.id!,
        elo: i.statistics?.elo ?? 0, // actually nullable from the backend
        matches: i.statistics?.matches!,
        points: i.statistics?.points!,
        matchesWon: i.statistics?.wins!,
        name: i.profile?.name!,
        avatarUrl: i.profile?.avatarUrl,
        profileId: i.profileId!,
        cups: i.statistics?.moves ?? 0,
        avgTeamSize: i.statistics?.avgTeamSize ?? 1,
    };
};
