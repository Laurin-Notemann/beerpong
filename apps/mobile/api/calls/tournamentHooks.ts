import {
    QueryClient,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import type { Tournament } from '@/lib/tournament';
import type { Components } from '@/openapi/openapi';
import { showErrorToast } from '@/toast';

export const tournamentsKey = (groupId: string) => [
    QK.group,
    groupId,
    QK.tournaments,
];
function upsert(qc: QueryClient, groupId: string, tournament: Tournament) {
    qc.setQueryData<Tournament[]>(tournamentsKey(groupId), (prev = []) => [
        tournament,
        ...prev.filter((t) => t.id !== tournament.id),
    ]);
    qc.setQueryData([...tournamentsKey(groupId), tournament.id], tournament);
}
export function useTournaments(groupId: string | null | undefined) {
    const { api } = useApi();
    return useQuery({
        queryKey: tournamentsKey(groupId ?? 'NULL'),
        enabled: !!groupId,
        queryFn: async () =>
            (await (await api).getTournaments({ groupId: groupId! })).data
                .data ?? [],
    });
}
export function useTournament(groupId: string | null | undefined, id: string) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useQuery({
        queryKey: [...tournamentsKey(groupId ?? 'NULL'), id],
        enabled: !!groupId && !!id,
        queryFn: async () =>
            (await (await api).getTournament({ groupId: groupId!, id })).data
                .data,
        initialData: () =>
            qc
                .getQueryData<Tournament[]>(tournamentsKey(groupId ?? 'NULL'))
                ?.find((t) => t.id === id),
    });
}
export function useCreateTournament(groupId: string | null | undefined) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            body,
        }: {
            id: string;
            body: Components.Schemas.TournamentCreateDto;
        }) => {
            if (!groupId) throw new Error('No group selected');
            const t = (
                await (await api).createTournament({ groupId, id }, body)
            ).data.data;
            if (!t) throw new Error('Empty tournament response');
            return t;
        },
        onSuccess: (t) => upsert(qc, t.groupId, t),
        onError: (err) => {
            captureMutationErr('createTournament')(err);
            showErrorToast("Couldn't start the tournament.", err);
        },
    });
}
export function useCancelTournament(groupId: string | null | undefined) {
    const { api } = useApi();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            if (!groupId) throw new Error('No group selected');
            return (await (await api).cancelTournament({ groupId, id })).data
                .data;
        },
        onSuccess: (t) => {
            if (t) upsert(qc, t.groupId, t);
        },
        onError: (err) => {
            captureMutationErr('cancelTournament')(err);
            showErrorToast("Couldn't cancel the tournament.", err);
        },
    });
}
export function applyTournamentEvent(
    qc: QueryClient,
    groupId: string,
    body: unknown
) {
    if (body && typeof body === 'object' && 'id' in body && 'stages' in body) {
        upsert(qc, groupId, body as Tournament);
    }
    // Committed updates can be published in the opposite order. Reconcile
    // with the current row after applying the immediate socket value.
    void qc.invalidateQueries({ queryKey: tournamentsKey(groupId) });
}
