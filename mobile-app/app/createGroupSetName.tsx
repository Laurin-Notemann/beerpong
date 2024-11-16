import { useRouter } from 'expo-router';
import React from 'react';

import { useCreateGroupMutation } from '@/api/calls/group/groupHooks';
import ErrorScreen from '@/components/ErrorScreen';
import CreateGroupSetName from '@/components/screens/CreateGroupSetName';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

// Route params must be string types since they come from URL
export interface CreateGroupSetNameParams {
    members: string; // This will be JSON string of GroupMember[]
}

export default function Page() {
    const router = useRouter();
    const { members, addName } = useCreateGroupStore();
    const { mutate, data, status } = useCreateGroupMutation();
    const { addGroup } = useGroupStore();

    if (status === 'success' && data?.data) {
        if (!data.data.id) {
            return <ErrorScreen message="Tja da geht wohl was nicht" />;
        }
        addGroup(data.data.id);
        router.push('/');
    }

    return (
        <CreateGroupSetName
            onSubmit={(group) => {
                addName(group.name);
                mutate({ name: group.name });
            }}
        />
    );
}
