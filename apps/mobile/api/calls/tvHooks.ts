import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { env } from '@/api/env';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { DisplayConfig, DisplayPatch, parseConfig } from '@/lib/tvDisplay';
import { showErrorToast } from '@/toast';

/**
 * The TV remote talks to Versus TV's server (apps/web, `src/tv/server/appRemote.ts`), not the
 * API. It goes through the API client anyway, for its login and error reporting.
 */

/** a Versus TV that's on and shows the group */
export interface Tv {
    id: string;
    config: DisplayConfig;
}

const tvsKey = (groupId: ApiId) => [QK.group, groupId, QK.tvs];

const tvsUrl = (groupId: ApiId) =>
    `${env.tvBaseUrl}/tv/api/groups/${groupId}/displays`;

export function useTvs(groupId: ApiId | null) {
    const { api } = useApi();

    return useQuery<Tv[]>({
        queryKey: tvsKey(groupId ?? 'NULL'),
        enabled: !!groupId,
        queryFn: async () => {
            if (!groupId) return [];
            const res = await (await api).get<Tv[]>(tvsUrl(groupId));
            return res.data.map((i) => ({
                id: i.id,
                config: parseConfig(i.config),
            }));
        },
        // TVs aren't on the group's socket; while the remote is open, this brings what other
        // phones changed
        refetchInterval: 3_000,
    });
}

/** what the remote does to one TV; a change shows right away */
export function useTvRemote(groupId: ApiId | null, tvId: string | undefined) {
    const { api } = useApi();
    const qc = useQueryClient();
    const key = tvsKey(groupId ?? 'NULL');
    const url = groupId && tvId ? `${tvsUrl(groupId)}/${tvId}` : undefined;
    const refetch = () => qc.invalidateQueries({ queryKey: key });

    const update = useMutation({
        mutationFn: async (patch: DisplayPatch) => {
            if (url) await (await api).patch(url, patch);
        },
        onMutate: async (patch) => {
            // a refetch from before the change would undo it on screen
            await qc.cancelQueries({ queryKey: key });
            qc.setQueryData<Tv[]>(key, (prev) =>
                prev?.map((i) =>
                    i.id === tvId
                        ? { ...i, config: { ...i.config, ...patch } }
                        : i
                )
            );
        },
        onError: (err) => showErrorToast("Couldn't change the TV.", err),
        onSettled: refetch,
    });

    const reload = useMutation({
        mutationFn: async () => {
            if (url) await (await api).post(`${url}/reload`);
        },
        onError: (err) => showErrorToast("Couldn't reload the TV.", err),
    });

    const removeGroup = useMutation({
        mutationFn: async () => {
            if (url) await (await api).delete(url);
        },
        onError: (err) =>
            showErrorToast("Couldn't take the group off the TV.", err),
        onSettled: refetch,
    });

    return { update, reload, removeGroup };
}
