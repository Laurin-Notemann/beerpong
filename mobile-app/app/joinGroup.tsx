import { AxiosError } from 'axios';
import React from 'react';

import { useJoinGroupMutation } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import JoinGroup from '@/components/screens/JoinGroup';
import { showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Page() {
    const nav = useNavigation();

    const joinGroupMutation = useJoinGroupMutation();

    const { addGroup, selectGroup } = useGroupStore();

    async function onSubmit(code: string) {
        try {
            const data = await joinGroupMutation.mutateAsync(code);

            if (data?.data?.id) {
                addGroup(data.data.id);
                selectGroup(data.data.id);

                nav.navigate('index');

                showSuccessToast(`You joined "${data.data.name}"`);
            }
        } catch (err) {
            ConsoleLogger.error('Error joining group:', err);
        }
    }

    const isNotFound =
        (joinGroupMutation.error as AxiosError | undefined)?.status === 404;

    return (
        <JoinGroup
            isNotFound={isNotFound}
            isLoading={joinGroupMutation.isPending}
            onSubmit={onSubmit}
            joinGroupError={joinGroupMutation.error}
        />
    );
}
