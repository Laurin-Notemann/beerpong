import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';

import {
    useCreateGroupMutation,
    useGroupPresetsQuery,
} from '@/api/calls/groupHooks';
import { QK } from '@/api/utils/reactQuery';
import LoadingScreen from '@/components/LoadingScreen';
import { CreateGroupSetGame } from '@/components/screens/CreateGroupSetGame';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const router = useRouter();
    const { members, name } = useCreateGroupStore();
    const createGroupMutation = useCreateGroupMutation();
    const presetsQuery = useGroupPresetsQuery();
    const matchDraft = useMatchDraftStore();
    const queryClient = useQueryClient();
    const { selectGroup } = useGroupStore();

    const presets =
        presetsQuery.data?.data?.map((i) => ({
            id: i.id,
            title: i.title,
            imageUrl: i.imageUrl,
        })) ?? [];

    const [createGroup, isCreating] = useSingleFlight(
        async (sport: {
            preset?: string;
            custom?: {
                name: string;
            };
        }) => {
            if (!name) return;

            try {
                const data = await createGroupMutation.mutateAsync({
                    name,
                    profileNames: members.map((m) => m.name),
                    sportPreset: sport.preset,
                    customSportName: sport.custom?.name,
                });
                if (!data?.data?.id) {
                    throw new Error('invalid create group response');
                }
                await queryClient.invalidateQueries({
                    queryKey: [QK.group, 'myGroups'],
                });
                matchDraft.actions.clear();
                selectGroup(data.data.id);

                showSuccessToast(`You created "${name}"`);

                router.dismissAll();
                router.replace('/');
            } catch (err) {
                ConsoleLogger.error('failed to create group:', err);
                showErrorToast('Failed to create group.', err);
            }
        }
    );

    if (presetsQuery.isLoading) {
        return <LoadingScreen />;
    }

    return (
        <CreateGroupSetGame
            games={presets}
            onSubmit={createGroup}
            isPending={isCreating}
        />
    );
}
