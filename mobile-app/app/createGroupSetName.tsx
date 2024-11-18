import React from 'react';

import { useCreateGroupMutation } from '@/api/calls/groupHooks';
import ErrorScreen from '@/components/ErrorScreen';
import CreateGroupSetName from '@/components/screens/CreateGroupSetName';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import { useNavigation } from './navigation/useNavigation';

// Route params must be string types since they come from URL
export interface CreateGroupSetNameParams {
    members: string; // This will be JSON string of GroupMember[]
}

export default function Page() {
    const nav = useNavigation();

    const { members, addName } = useCreateGroupStore();
    const { mutateAsync } = useCreateGroupMutation();
    const { addGroup } = useGroupStore();

    const [error, setError] = React.useState<string | null>(null);

    async function onSubmit(group: { name: string }) {
        addName(group.name);

        const data = await mutateAsync({
            name: group.name,
            profileNames: members.map((m) => m.name),
        });
        if (!data?.data?.id) {
            setError('failed to create group');

            return;
        }
        addGroup(data.data.id);

        nav.navigate('index');
    }

    if (error) {
        return <ErrorScreen message={error} />;
    }
    return <CreateGroupSetName onSubmit={onSubmit} />;
}
