import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchProfiles, withProfiles } from '@/api/calls/profileHooks';
import { ApiId, WithProfile } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { LeaderboardDto, Paths, PlayerDtoExtended } from '@/openapi/openapi';

export enum LeaderboardScope {
    TODAY = 'today',
    SEASON = 'season',
    ALL_TIME = 'all-time',
}

export const useGetLeaderboardQuery = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined,
    scope: LeaderboardScope
) => {
    const { api } = useApi();

    const qc = useQueryClient();

    return useQuery<
        | (Omit<Paths.GetLeaderboard.Responses.$200, 'data'> & {
              data?: Omit<LeaderboardDto, 'entries'> & {
                  entries?: WithProfile<PlayerDtoExtended>[];
              };
          })
        | null
    >({
        queryKey: [
            QK.group,
            groupId ?? 'NULL',
            QK.season,
            seasonId ?? 'NULL',
            QK.players,
            scope,
        ],
        enabled: !!groupId && !!seasonId,
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }

            const [res, profiles] = await Promise.all([
                (await api).getLeaderboard({ groupId, seasonId, scope }),
                fetchProfiles(qc, api, groupId),
            ]);

            return {
                ...res.data,
                data: res.data.data && {
                    ...res.data.data,
                    entries: withProfiles(
                        res.data.data.entries ?? [],
                        profiles
                    ),
                },
            };
        },
    });
};
