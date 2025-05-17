import React from 'react';

import { useCreateGroupMutation } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import CreateGroupSetName from '@/components/screens/CreateGroupSetName';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export default function Page() {
    const nav = useNavigation();
    const { members, addName, name } = useCreateGroupStore();
    const createGroupMutation = useCreateGroupMutation();
    const { addGroup } = useGroupStore();

    const { supportAdditionalGames } = useLocalSettings();

    async function onNameGroup(group: { name: string }) {
        addName(group.name);

        if (supportAdditionalGames) {
            nav.navigate('createGroupSetGame');
        } else {
            createGroup();
        }
    }

    async function createGroup() {
        if (!name) return;

        try {
            const data = await createGroupMutation.mutateAsync({
                name,
                profileNames: members.map((m) => m.name),
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
    return (
        <CreateGroupSetName
            onSubmit={onNameGroup}
            isPending={createGroupMutation.isPending}
            hasNextStep={supportAdditionalGames}
        />
    );
}
