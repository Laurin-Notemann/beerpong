import React from 'react';

import { useGroupPresetsQuery } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import CreateGroupAddMembers from '@/components/screens/CreateGroupAddMembers';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

export default function Page() {
    const nav = useNavigation();

    const { addMembers } = useCreateGroupStore();

    // prefetch this here so it's already fetched in the next step
    useGroupPresetsQuery();

    return (
        <CreateGroupAddMembers
            onSubmit={(members) => {
                addMembers(members);
                nav.navigate('createGroupSetName');
            }}
        />
    );
}
