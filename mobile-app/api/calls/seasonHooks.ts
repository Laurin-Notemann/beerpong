import { useMutation, useQuery } from "@tanstack/react-query";
import { useApi } from "../utils/create-api";
import { Paths } from "@/openapi/openapi";
import { ApiId } from "../types";

export const useSeasonQuery = (seasonId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetSeasonById.Responses.$200 | undefined>({
        queryKey: ['season', seasonId],
        queryFn: async () => {
            if (!seasonId) {
                return undefined;
            }
            const res = await (await api).getSeasonById(seasonId);

            return res?.data;
        },
    });
}

export const useAllSeasonQuery = (groupId: ApiId | null) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllSeasons.Responses.$200 | undefined>({
        queryKey: ['group', groupId, 'seasons'],
        queryFn: async () => {
            if (!groupId) {
                return undefined;
            }
            const res = await (await api).getAllSeasons(groupId);

            return res?.data;
        },
    });
}

export const useStartNewSeasonMutation = () => {
    const { api } = useApi();
    return useMutation<
        Paths.StartNewSeason.Responses.$200 | undefined,
        Error,
        Paths.StartNewSeason.RequestBody
    >({
        mutationFn: async (body) => {
            const res = await (await api).startNewSeason(null, body);
            return res?.data;
        },
    });
}
