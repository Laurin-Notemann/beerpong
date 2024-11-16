import { useRouter } from 'expo-router';
import React from 'react';

import { useCreateGroupMutation } from '@/api/calls/group/groupHooks';
import CreateGroupSetName from '@/components/screens/CreateGroupSetName';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

// Route params must be string types since they come from URL
export interface CreateGroupSetNameParams {
    members: string; // This will be JSON string of GroupMember[]
}

export default function Page() {
    const router = useRouter();
    const { members, addName } = useCreateGroupStore();
    const { mutate } = useCreateGroupMutation();

    console.log(members);

    return (
        <CreateGroupSetName
            onSubmit={(group) => {
                addName(group.name);
                mutate({ name: group.name });
                router.push('/');
            }}
        />
    );
}
