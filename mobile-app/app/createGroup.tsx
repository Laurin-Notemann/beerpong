import { useNavigation } from 'expo-router';
import React from 'react';

import CreateGroupAddMembers from '@/components/screens/CreateGroupAddMembers';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

export default function Page() {
    const nav = useNavigation();
    const { addMembers } = useCreateGroupStore();

    return (
        <CreateGroupAddMembers
            onSubmit={(members) => {
                addMembers(members);
                // @ts-ignore
                nav.navigate('createGroupSetName');
            }}
        />
    );
}
