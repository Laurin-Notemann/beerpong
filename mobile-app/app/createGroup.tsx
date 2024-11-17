import React from 'react';

import { useNavigation } from '@/app/navigation/useNavigation';
import CreateGroupAddMembers from '@/components/screens/CreateGroupAddMembers';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

export default function Page() {
    const nav = useNavigation();

    const { addMembers } = useCreateGroupStore();

    return (
        <CreateGroupAddMembers
            onSubmit={(members) => {
                addMembers(members);
                nav.navigate('createGroupSetName');
            }}
        />
    );
}
