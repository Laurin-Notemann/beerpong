import { useNavigation } from 'expo-router';
import React from 'react';

import CreateGroupAddMembers from '@/components/screens/CreateGroupAddMembers';

export default function Page() {
    const nav = useNavigation();

    return (
        <CreateGroupAddMembers
            onSubmit={(members) => {
                // @ts-ignore
                nav.navigate('createGroupSetName');
            }}
        />
    );
}
