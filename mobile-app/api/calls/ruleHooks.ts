import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useGroup } from '@/api/calls/seasonHooks';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { mockRules } from '@/components/mockData/rules';
import { Paths } from '@/openapi/openapi';
import { showErrorToast } from '@/toast';

export const useMoves = (
    groupId: ApiId | null,
    seasonId: ApiId | null | undefined
) => {
    const { api } = useApi();

    return useQuery<Paths.GetAllRuleMoves.Responses.$200 | null>({
        queryKey: [
            QK.group,
            groupId ?? 'NULL',
            QK.season,
            seasonId ?? 'NULL',
            QK.ruleMoves,
        ],
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

    async function _setRules(
        rules: { id: string; title: string; description: string }[]
    ) {
        const hasChanges = JSON.stringify(rules) !== JSON.stringify(localRules);
        if (!hasChanges) return;

        setLocalRules(rules);
        qc.setQueryData([QK.group, groupId, QK.season, seasonId, QK.rules], {
            data: rules,
        });
        try {
            await setRulesMutation.mutateAsync({
                groupId: groupId!,
                seasonId: seasonId!,
                rules,
            });
        } catch (err) {
            showErrorToast('Failed to update rules.');
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
            _setRules([
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
        setRules: _setRules,
        rules: useMemo(() => localRules, [localRules]),
        reorderRules,
        createRulesMutation,
        setDefaultRules,
        deleteRules,
        updateRule,
    };
}
