import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { env } from '@/api/env';
import {
    LiveMatchTeam,
    liveMatchTeams,
    useGroupLiveMatches,
} from '@/api/liveMatch/useGroupLiveMatches';
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
    /** from its browser, e.g. "Samsung TV"; numbered when several have the same */
    name: string;
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
            const res = await (
                await api
            ).get<{ id: string; name?: string; config: unknown }[]>(
                tvsUrl(groupId)
            );
            const seen = new Map<string, number>();
            return res.data.map((i) => {
                const name = i.name || 'TV';
                const count = (seen.get(name) ?? 0) + 1;
                seen.set(name, count);
                return {
                    id: i.id,
                    name: count > 1 ? `${name} ${count}` : name,
                    config: parseConfig(i.config),
                };
            });
        },
        // TVs aren't on the group's socket; while the remote is open, this brings what other
        // phones changed and which TVs are on
        refetchInterval: 3_000,
    });
}

/** puts the group on the TV that shows `code` (Add TV); resolves to that TV */
export function useAddTv(groupId: ApiId | null) {
    const { api } = useApi();
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (code: string) => {
            if (!groupId) throw new Error('no group');
            const res = await (
                await api
            ).post<{ id: string }>(tvsUrl(groupId), { code });
            return res.data;
        },
        onSettled: () =>
            qc.invalidateQueries({ queryKey: tvsKey(groupId ?? 'NULL') }),
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

export interface TvMatch {
    id: string;
    startedAt: string;
    blue: LiveMatchTeam;
    red: LiveMatchTeam;
}

/**
 * The group's live matches as a TV knows them, most recently active first: those on the server
 * (not one only this phone has yet), with their teams from the active season, where live
 * matches are played.
 */
export function useTvMatches(
    groupId: ApiId | null,
    seasonId: ApiId | null
): TvMatch[] {
    const players = usePlayersQuery(groupId, seasonId).data?.data;
    const moves = useMoves(groupId, seasonId).data?.data;
    const { matches } = useGroupLiveMatches(groupId);

    return matches
        .filter((i) => !i.isPendingCreate)
        .map((i) => ({
            id: i.id,
            startedAt: i.startedAt,
            ...liveMatchTeams(i.state, players, moves),
        }));
}
