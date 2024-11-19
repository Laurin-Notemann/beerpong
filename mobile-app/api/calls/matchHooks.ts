import { useMutation, useQuery } from '@tanstack/react-query';

import { Paths } from '@/openapi/openapi';

import { ApiId } from '../types';
import { useApi } from '../utils/create-api';
import { QK } from '../utils/reactQuery';

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

    const matches = matchesQuery.data.data;

    matchesQuery.data.data = matches.filter((i) =>
        i.teamMembers?.find((j) => j.playerId === playerId)
    );
    return matchesQuery;
};

export const useCreateMatchMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.CreateMatch.Responses.$200 | null,
        Error,
        Paths.CreateMatch.RequestBody & { groupId: ApiId; seasonId: ApiId }
    >({
        mutationFn: async (body) => {
            const res = await (await api).createMatch(body, body);
            return res?.data;
        },
    });
};
