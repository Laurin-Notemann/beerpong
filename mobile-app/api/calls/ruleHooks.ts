import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGroup } from '@/api/calls/seasonHooks';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { mockRules } from '@/components/mockData/rules';
import { Paths } from '@/openapi/openapi';

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

    const rules = (data?.data ?? []).map((i) => ({
        id: i.id!,
        title: i.title!,
        description: i.description!,
    }));

    function _setRules(rules: { title: string; description: string }[]) {
        qc.setQueryData([QK.group, groupId, QK.season, seasonId, QK.rules], {
            data: rules,
        });
        setRulesMutation.mutate({
            groupId: groupId!,
            seasonId: seasonId!,
            rules,
        });
    }

    function deleteRules(id: string[]) {
        _setRules(rules.filter((i) => !id.includes(i.id)));
    }

    function updateRule(id: string, title: string, description: string) {
        _setRules(
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
        mutationFn: async (input) => _setRules([...rules, ...input]),
    });

    function setDefaultRules() {
        _setRules(
            mockRules.map((i) => ({
                title: i.title,
                description: i.description.slice(0, 255),
            }))
        );
    }

    return {
        ...rulesQuery,
        rules,
        reorderRules,
        createRulesMutation,
        setDefaultRules,
        deleteRules,
        updateRule,
    };
}
