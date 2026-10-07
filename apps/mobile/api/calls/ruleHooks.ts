import {
    queryOptions,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useGroup } from '@/api/calls/seasonHooks';
import { ApiId } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { mockRules } from '@/components/mockData/rules';
import { Client, Paths } from '@/openapi/openapi';
import { showErrorToast } from '@/toast';

export const movesQueryOptions = (
    api: Promise<Client>,
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) =>
    queryOptions<Paths.GetAllRuleMoves.Responses.$200 | null>({
        queryKey: [
            QK.group,
            groupId ?? 'NULL',
            QK.season,
            seasonId ?? 'NULL',
            QK.ruleMoves,
        ],
        enabled: !!groupId && !!seasonId,
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }
            const res = await (
                await api
            ).getAllRuleMoves({ groupId, seasonId });

            return res?.data;
        },
    });

export const useMoves = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery(movesQueryOptions(api, groupId, seasonId));
};

export const useGetRules = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetRules.Responses.$200 | null>({
        queryKey: [
            QK.group,
            groupId ?? 'NULL',
            QK.season,
            seasonId ?? 'NULL',
            QK.rules,
        ],
        enabled: !!groupId && !!seasonId,
        queryFn: async () => {
            if (!groupId || !seasonId) {
                return null;
            }
            const res = await (await api).getRules({ groupId, seasonId });

            return res?.data;
        },
    });
};

export const useSetRulesMutation = () => {
    const { api } = useApi();

    return useMutation<
        Paths.WriteRules.Responses.$200 | null,
        Error,
        {
            groupId: string;
            seasonId: string;
            rules: {
                title: string;
                description: string;
            }[];
        }
    >({
        mutationFn: async (body) => {
            const { groupId, seasonId, rules } = body;
            const res = await (
                await api
            ).writeRules({ groupId, seasonId }, rules);

            return res?.data;
        },
        onError: captureMutationErr('updateRules'),
    });
};

export function useRules() {
    const { groupId, seasonId } = useGroup();

    const qc = useQueryClient();

    const { data, ...rulesQuery } = useGetRules(groupId, seasonId);

    const setRulesMutation = useSetRulesMutation();

    const rules = useMemo(
        () =>
            (data?.data ?? []).map((i) => ({
                id: i.id!,
                title: i.title!,
                description: i.description!,
            })),
        [data?.data]
    );

    /** shows the rules right away; if saving fails, they go back to what they were and this throws */
    async function saveRules(
        rules: { id: string; title: string; description: string }[]
    ) {
        const hasChanges = JSON.stringify(rules) !== JSON.stringify(localRules);
        if (!hasChanges) return;

        const queryKey = [QK.group, groupId, QK.season, seasonId, QK.rules];
        const previous = qc.getQueryData(queryKey);

        setLocalRules(rules);
        qc.setQueryData(queryKey, { data: rules });
        try {
            await setRulesMutation.mutateAsync({
                groupId: groupId!,
                seasonId: seasonId!,
                rules,
            });
        } catch (err) {
            setLocalRules(localRules);
            qc.setQueryData(queryKey, previous);
            throw err;
        }
    }

    /** for the rules list, which has no error handling of its own */
    async function _setRules(
        rules: { id: string; title: string; description: string }[]
    ) {
        try {
            await saveRules(rules);
        } catch (err) {
            showErrorToast('Failed to update rules.', err);
        }
    }

    async function deleteRules(id: string[]) {
        await _setRules(rules.filter((i) => !id.includes(i.id)));
    }

    async function updateRule(id: string, title: string, description: string) {
        await _setRules(
            rules.map((i) => (i.id === id ? { ...i, title, description } : i))
        );
    }
    const reorderRules = _setRules;

    const createRulesMutation = useMutation<
        void,
        Error,
        {
            title: string;
            description: string;
        }[]
    >({
        mutationFn: (input) =>
            saveRules([
                ...rules,
                ...input.map((i, idx) => ({ ...i, id: idx.toString() })),
            ]),
    });

    async function setDefaultRules() {
        await _setRules(
            mockRules.map((i, idx) => ({
                id: idx.toString(),
                title: i.title,
                description: i.description,
            }))
        );
    }

    const [localRules, setLocalRules] = useState(rules);

    useEffect(() => {
        setLocalRules(rules);
    }, [rules]);

    return {
        isMutationPending: setRulesMutation.isPending,
        ...rulesQuery,
        setRules: saveRules,
        rules: useMemo(() => localRules, [localRules]),
        reorderRules,
        createRulesMutation,
        setDefaultRules,
        deleteRules,
        updateRule,
    };
}

/**
 * marks the season's default move, what a pro mode quick hit counts as; null: none. Shown right
 * away; the server clears the other moves' flag and tells the group.
 */
export const useSetDefaultMoveMutation = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();
    const qc = useQueryClient();
    const queryKey = [
        QK.group,
        groupId ?? 'NULL',
        QK.season,
        seasonId ?? 'NULL',
        QK.ruleMoves,
    ];

    return useMutation<void, Error, string | null, { previous: unknown }>({
        mutationFn: async (moveId) => {
            const moves =
                qc.getQueryData<Paths.GetAllRuleMoves.Responses.$200>(queryKey)
                    ?.data ?? [];
            // unmarking is an update of the move that was the default
            const move = moves.find((i) =>
                moveId ? i.id === moveId : i.defaultMove
            );
            if (!groupId || !seasonId || !move?.id) return;

            await (
                await api
            ).updateRuleMove(
                { groupId, seasonId, ruleMoveId: move.id },
                {
                    name: move.name ?? undefined,
                    pointsForScorer: move.pointsForScorer,
                    pointsForTeam: move.pointsForTeam,
                    finishingMove: move.finishingMove,
                    cups: move.cups,
                    defaultMove: !!moveId,
                }
            );
        },
        onMutate: async (moveId) => {
            await qc.cancelQueries({ queryKey });
            const previous = qc.getQueryData(queryKey);
            qc.setQueryData<Paths.GetAllRuleMoves.Responses.$200>(
                queryKey,
                (prev) =>
                    prev && {
                        ...prev,
                        data: prev.data?.map((i) => ({
                            ...i,
                            defaultMove: !!moveId && i.id === moveId,
                        })),
                    }
            );
            return { previous };
        },
        onError: (err, _moveId, context) => {
            qc.setQueryData(queryKey, context?.previous);
            captureMutationErr('setDefaultMove')(err);
        },
        onSettled: () => qc.invalidateQueries({ queryKey }),
    });
};
