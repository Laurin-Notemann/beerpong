import React from 'react';

import { useCreateGroupMutation } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import CreateGroupSetName from '@/components/screens/CreateGroupSetName';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

export default function Page() {
    const nav = useNavigation();
    const { addName } = useCreateGroupStore();
    const createGroupMutation = useCreateGroupMutation();

    async function onNameGroup(group: { name: string }) {
        addName(group.name);

        nav.navigate('createGroupSetGame');
    }

    return (
        <CreateGroupSetName
            onSubmit={onNameGroup}
            isPending={createGroupMutation.isPending}
        />
    );
}
