import React from 'react';

import {
    useCreateGroupMutation,
    useGroupPresetsQuery,
} from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import LoadingScreen from '@/components/LoadingScreen';
import { CreateGroupSetGame } from '@/components/screens/CreateGroupSetGame';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Page() {
    const nav = useNavigation();
    const { members, name } = useCreateGroupStore();
    const createGroupMutation = useCreateGroupMutation();
    const { addGroup } = useGroupStore();
    const presetsQuery = useGroupPresetsQuery();

    const presets =
        presetsQuery.data?.data?.map((i) => ({
            id: i.id!,
            title: i.title!,
            imageUrl: i.imageUrl!,
        })) ?? [];

    async function createGroup(sport: {
        preset?: string;
        custom?: {
            name: string;
        };
    }) {
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
            addGroup(data.data.id);

            showSuccessToast(`You created "${name}"`);

            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to create group:', err);
            showErrorToast('Failed to create group.');
        }
    }

    if (presetsQuery.isLoading) {
        return <LoadingScreen />;
    }

    return (
        <CreateGroupSetGame
            games={presets}
            onSubmit={createGroup}
            isPending={createGroupMutation.isPending}
        />
    );
}
