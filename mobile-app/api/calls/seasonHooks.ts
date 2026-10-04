import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { LeaderboardScope } from '@/api/calls/leaderboardHooks';
import { fetchProfiles, withProfiles } from '@/api/calls/profileHooks';
import { ApiId, WithProfile } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import {
    MatchDtoExtended,
    Paths,
    PlayerDtoExtended,
    RuleMoveDto,
    SeasonDto,
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

export const useAllSeasonsQuery = (groupId: ApiId | null) => {
    const { api } = useApi();

    const qc = useQueryClient();

    return useQuery<
        | (Omit<Paths.GetAllSeasons.Responses.$200, 'data'> & {
              data?: (SeasonDto & {
                  numMatches: number;
                  players: Player[];
                  rawPlayers: WithProfile<PlayerDtoExtended>[];
                  matches: MatchDtoExtended[];
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
            const [res, profiles] = await Promise.all([
                (await api).getAllSeasons(groupId),
                fetchProfiles(qc, api, groupId),
            ]);

            const rawSeasons = res.data.data ?? [];

            const seasons = await Promise.all(
                rawSeasons.map(async (season) => {
                    const client = await api;
                    const ids = { groupId, seasonId: season.id! };
                    const [matches, ruleMoves, leaderboard] = await Promise.all(
                        [
                            client.getAllMatchesExtended(ids),
                            client.getAllRuleMoves(ids),
                            client.getLeaderboard({
                                ...ids,
                                scope: LeaderboardScope.SEASON,
                            }),
                        ]
                    );

                    const players = withProfiles(
                        leaderboard.data.data?.entries ?? [],
                        profiles
                    );

                    return {
                        ...season,
                        numMatches: matches.data.data?.length ?? 0,
                        players: players.map(toPlayer),
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
                (prev) => ({
                    ...prev,
                    data: {
                        ...prev?.data,
                        seasonSettings: {
                            ...seasonSettings,
                            ...partialUpdate,
                        },
                    },
                })
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
    };
};
