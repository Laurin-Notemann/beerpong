import { useMutation, useQuery } from '@tanstack/react-query';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { LeaderboardScope } from '@/api/calls/leaderboardHooks';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { Paths } from '@/openapi/openapi';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export const useSeasonQuery = (seasonId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetSeasonById.Responses.$200 | null>({
        // TODO: this won't get refetched by the realtime event because we don't have access to the group id here
        queryKey: [QK.seasons, seasonId],
        queryFn: async () => {
            if (!seasonId) {
                return null;
            }
            const res = await (await api).getSeasonById(seasonId);

            return res?.data;
        },
    });
};

export const useAllSeasonsQuery = (groupId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllSeasons.Responses.$200 | null>({
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

                    const leaderboard = await (
                        await api
                    ).getLeaderboard({
                        groupId,
                        seasonId: season.id!,
                        scope: LeaderboardScope.SEASON,
                    });

                    const players = leaderboard.data.data?.entries ?? [];

                    return {
                        ...season,
                        numMatches: matches.data.data?.length ?? 0,
                        players: players.map((i) => {
                            return {
                                id: i.playerDto!.id!,
                                name: i.playerDto!.profile!.name!,
                                points: i.totalPoints!,
                                matches: i.totalGames!,
                                matchesWon: 0,
                                elo: 0,
                                avatarUrl:
                                    i.playerDto!.profile!.avatarAsset?.url,
                            };
                        }),
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

    const seasonId = groupQueryData?.data?.activeSeason?.id;

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
            const res = await (await api).updateSeasonById(body);
            return res?.data;
        },
    });
};
