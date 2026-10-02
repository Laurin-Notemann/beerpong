import { router } from 'expo-router';
import { useEffect, useEffectEvent, useMemo } from 'react';
import { create } from 'zustand';

import {
    useGetMyGroupsQuery,
    useJoinGroupMutation,
    useLeaveGroupMutation,
} from '@/api/calls/groupHooks';

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

/**
 * Keeps a group selected: picks the first group when none (or a left one) is selected, and sends
 * users without any group to onboarding. Mounted once, in the app's stack layout; screens that
 * read the group store must not redirect on their own.
 */
export function useEnsureGroupSelected() {
    const { selectedGroupId, selectGroup } = useStore();
    const myGroupsQuery = useGetMyGroupsQuery();

    const groups = myGroupsQuery.data?.data;
    // if this changes we either left, created, or joined a group.
    const groupsKey = groups?.map((i) => i.id).join();

    const ensureSelection = useEffectEvent(() => {
        if (!groups) return;
        if (selectedGroupId && groups.some((g) => g.id === selectedGroupId)) {
            return;
        }
        const firstGroupId = groups[0]?.id ?? null;
        if (firstGroupId) {
            selectGroup(firstGroupId);
        } else {
            selectGroup(null);
            router.navigate('/onboarding');
        }
    });

    useEffect(() => {
        ensureSelection();
    }, [groupsKey]);
}
