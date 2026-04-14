import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React from 'react';

import { QK } from '@/api/utils/reactQuery';
import { useNavigation } from '@/app/navigation/useNavigation';
import JoinGroup from '@/components/screens/JoinGroup';
import { showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Page() {
    const router = useRouter();

    const nav = useNavigation();

    const { joinGroupMutation, selectGroup } = useGroupStore();

    const queryClient = useQueryClient();

    async function onSubmit(code: string) {
        try {
            const data = await joinGroupMutation.mutateAsync(code);

            if (data?.data?.id) {
                selectGroup(data.data.id);

                await queryClient.invalidateQueries({
                    queryKey: [QK.group, 'myGroups'],
                });

                nav.navigate('index');

                showSuccessToast(`You joined "${data.data.name}"`);
                router.dismissAll();
                router.replace('/');
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
