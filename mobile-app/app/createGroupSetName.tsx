import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';

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
    const { mutate, data, status } = useCreateGroupMutation();
    const { addGroup } = useGroupStore();

    const [error, setError] = React.useState<string | null>(null);

    useEffect(() => {
        if (status === 'success' && data?.data) {
            if (!data.data.id) {
                setError('Tja da geht wohl was nicht');
                return;
            }

            addGroup(data.data.id);

            nav.navigate('index');
        }
    }, [status, data, addGroup]);

    if (error) {
        return <ErrorScreen message={error} />;
    }

    return (
        <CreateGroupSetName
            onSubmit={(group) => {
                addName(group.name);
                mutate({
                    name: group.name,
                    profileNames: members.map((m) => m.name),
                });
            }}
        />
    );
}
