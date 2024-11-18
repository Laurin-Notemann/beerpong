import React from 'react';
import Toast from 'react-native-root-toast';

import { useCreateGroupMutation } from '@/api/calls/groupHooks';
import CreateGroupSetName from '@/components/screens/CreateGroupSetName';
import { ConsoleLogger } from '@/utils/logging';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const { members, addName } = useCreateGroupStore();
    const { mutateAsync } = useCreateGroupMutation();
    const { addGroup } = useGroupStore();

    async function onSubmit(group: { name: string }) {
        try {
            addName(group.name);

            const data = await mutateAsync({
                name: group.name,
                profileNames: members.map((m) => m.name),
            });
            if (!data?.data?.id) {
                throw new Error('invalid create group response');
            }
            addGroup(data.data.id);

            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to create group:', err);
            Toast.show('Failed to create group.', {
                duration: 1500,
                position: 1,
            });
        }
    }
    return <CreateGroupSetName onSubmit={onSubmit} />;
}
