import React from 'react';

import { useCreateGroupMutation } from '@/api/calls/groupHooks';
import CreateGroupSetName from '@/components/screens/CreateGroupSetName';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

export default function Page() {
    const nav = useNavigation();
    const { addName } = useCreateGroupStore();
    const createGroupMutation = useCreateGroupMutation();

    function onNameGroup(group: { name: string }) {
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
