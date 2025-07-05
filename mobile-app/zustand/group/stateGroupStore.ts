import { useEffect, useMemo } from 'react';
import { create } from 'zustand';

import {
    useGetMyGroupsQuery,
    useJoinGroupMutation,
    useLeaveGroupMutation,
} from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';

const useStore = create<{
    selectedGroupId: string | null;
    selectGroup: (groupId: string | null) => void;
}>()((set) => ({
    selectedGroupId: null,

    selectGroup: (selectedGroupId) => {
        set({ selectedGroupId });
    },
}));

export function useGroupStore() {
    const store = useStore();

    const myGroupsQuery = useGetMyGroupsQuery();

    const leaveGroupMutation = useLeaveGroupMutation();

    const joinGroupMutation = useJoinGroupMutation();

    const groupIds = useMemo(
        () => myGroupsQuery.data?.data?.map((g) => g.id!) ?? [],
        [myGroupsQuery.data]
    );
    const isLoadingGroups = myGroupsQuery.isLoading;

    const nav = useNavigation();

    // if this changes we either left, created, or joined a group.
    const groupsKey = myGroupsQuery.data?.data?.map((i) => i.id)?.join();

    useEffect(() => {
        if (!store.selectedGroupId && myGroupsQuery.data) {
            const groupId = myGroupsQuery.data.data?.[0]?.id ?? null;
            if (groupId) {
                store.selectGroup(myGroupsQuery.data.data?.[0]?.id ?? null);
            } else {
                nav.navigate('onboarding');
            }
        }
    }, [groupsKey]);

    return {
        groupIds,
        selectedGroupId: store.selectedGroupId,
        selectGroup: store.selectGroup,

        myGroupsQuery,
        joinGroupMutation,
        leaveGroupMutation,
        isLoadingGroups,
    };
}
