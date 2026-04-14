import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { LeaderboardScope } from '@/api/calls/leaderboardHooks';
import { ApiId } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import {
    MatchDto,
    Paths,
    PlayerDto,
    PlayerDtoExtended,
    ProfileDto,
    RuleMoveDto,
    SeasonDto,
    SeasonSettingsDto,
} from '@/openapi/openapi';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import {getAssetUrl} from "@/api/utils/assetUrl";

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

export const useAllSeasonsQuery = (groupId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<
        | (Omit<Paths.GetAllSeasons.Responses.$200, 'data'> & {
              data?: (SeasonDto & {
                  numMatches: number;
                  players: Player[];
                  rawPlayers: PlayerDto[];
                  matches: MatchDto[];
                  ruleMoves: RuleMoveDto[] | undefined;
              })[];
          })
        | null
    >({
        queryKey: [QK.group, groupId, QK.seasons],
        queryFn: async () => {
            if (!groupId) {
                return null;
            }
            const res = await (await api).getAllSeasons(groupId);

            const rawSeasons = res.data.data ?? [];

            const seasons = await Promise.all(
                rawSeasons.map(async (season) => {
                    const matches = await (
                        await api
                    ).getAllMatches({
                        groupId,
                        seasonId: season.id!,
                    });

                    const ruleMoves = await (
                        await api
                    ).getAllRuleMoves({
                        groupId,
                        seasonId: season.id!,
                    });

                    const leaderboard = await (
                        await api
                    ).getLeaderboard({
                        groupId,
                        seasonId: season.id!,
                        scope: LeaderboardScope.SEASON,
                    });

                    const players = leaderboard.data.data?.entries ?? [];

                    const profiles = await (
                        await api
                    ).listAllProfiles({
                        groupId
                    });

                    return {
                        ...season,
                        numMatches: matches.data.data?.length ?? 0,
                        players: players.map((p) =>
                            toPlayer(p, profiles.data?.data?.find(pr => pr.id === p.profileId)!)),
                        rawPlayers: players,
                        matches: matches.data.data ?? [],
                        ruleMoves: ruleMoves.data.data,
                    };
                })
            );

            return {
                data: seasons,
            };
        },
    });
};

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
    const { selectedGroupId } = useGroupStore();

    const { data: groupQueryData } = useGroupQuery(selectedGroupId);

    const seasonId = groupQueryData?.data?.activeSeasonId;

    return {
        groupId: selectedGroupId,
        seasonId,
        group: { ...(groupQueryData ?? {}) },
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
        | Required<SeasonSettingsDto>
        | undefined;

    const updateSeasonSettingsMutation = useMutation({
        mutationFn: async (partialUpdate: Omit<SeasonSettingsDto, 'id'>) => {
            if (!groupId || !seasonId || !seasonSettings) return;

            qc.setQueryData([QK.group, groupId, QK.seasons, seasonId], {
                data: {
                    seasonSettings: {
                        ...seasonSettings,
                        ...partialUpdate,
                    },
                },
            });
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
}

export const toPlayer = (i: PlayerDtoExtended, p: ProfileDto): Player => {
    return {
        id: i.id!,
        elo: i.statistics?.elo ?? 0, // actually nullable from the backend
        matches: i.statistics?.matches ?? 0,
        points: i.statistics?.points ?? 0,
        matchesWon: i.statistics?.wins ?? 0,
        name: p.name!,
        avatarUrl: getAssetUrl(p.assetIdAvatar),
        profileId: p.id!,
        cups: i.statistics?.moves ?? 0,
    };
};
