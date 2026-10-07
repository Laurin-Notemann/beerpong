import {
    QueryClient,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { uuid } from 'expo';

import { ApiId } from '@/api/types';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { CupPosition } from '@/lib/cupHits';
import { Components } from '@/openapi/openapi';
import { showErrorToast } from '@/toast';

type FormationDto = Components.Schemas.FormationDto;

/** a formation of the group, to re-rack cups into; the cups are points on the 7x7 cup grid */
export interface Formation {
    id: string;
    name: string;
    cups: CupPosition[];
}

const formationsKey = (groupId: ApiId) => [QK.group, groupId, QK.formations];

const toFormation = (i: FormationDto): Formation => ({
    id: i.id ?? '',
    name: i.name ?? '',
    cups: (i.cups ?? []).map((c) => ({ x: c.x ?? 0, y: c.y ?? 0 })),
});

export const newFormationId = () => uuid.v4();

export function useFormations(groupId: ApiId | null) {
    const { api } = useApi();

    return useQuery<Formation[]>({
        queryKey: formationsKey(groupId ?? 'NULL'),
        enabled: !!groupId,
        queryFn: async () => {
            if (!groupId) return [];
            const res = await (await api).getFormations({ groupId });

            return (res.data.data ?? []).map(toFormation);
        },
    });
}

function upsert(qc: QueryClient, groupId: ApiId, formation: Formation) {
    qc.setQueryData<Formation[]>(formationsKey(groupId), (prev = []) =>
        prev.some((i) => i.id === formation.id)
            ? prev.map((i) => (i.id === formation.id ? formation : i))
            : [...prev, formation]
    );
}

function remove(qc: QueryClient, groupId: ApiId, id: string) {
    qc.setQueryData<Formation[]>(formationsKey(groupId), (prev = []) =>
        prev.filter((i) => i.id !== id)
    );
}

/** creates or changes a formation; it shows right away and goes back if the server refuses */
export function useSaveFormation(groupId: ApiId | null) {
    const { api } = useApi();
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (formation: Formation) => {
            if (!groupId) return;
            await (
                await api
            ).saveFormation(
                { groupId, id: formation.id },
                { name: formation.name, cups: formation.cups }
            );
        },
        onMutate: (formation) => {
            if (groupId) upsert(qc, groupId, formation);
        },
        onError: (err) => {
            captureMutationErr('saveFormation')(err);
            showErrorToast("Couldn't save the formation.", err);
            void qc.invalidateQueries({
                queryKey: formationsKey(groupId ?? 'NULL'),
            });
        },
    });
}

export function useDeleteFormation(groupId: ApiId | null) {
    const { api } = useApi();
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!groupId) return;
            await (await api).deleteFormation({ groupId, id });
        },
        onMutate: (id) => {
            if (groupId) remove(qc, groupId, id);
        },
        onError: (err) => {
            captureMutationErr('deleteFormation')(err);
            showErrorToast("Couldn't delete the formation.", err);
            void qc.invalidateQueries({
                queryKey: formationsKey(groupId ?? 'NULL'),
            });
        },
    });
}

/** applies a FORMATIONS socket event to the cache */
export function applyFormationEvent(
    qc: QueryClient,
    groupId: ApiId,
    scope: string,
    body: unknown
) {
    if (scope === 'formationUpdate' && body && typeof body === 'object') {
        upsert(qc, groupId, toFormation(body as FormationDto));
    } else if (scope === 'formationDelete' && typeof body === 'string') {
        remove(qc, groupId, body);
    } else {
        void qc.invalidateQueries({ queryKey: formationsKey(groupId) });
    }
}
