import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useEffectEvent, useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
    useGetMyGroupsQuery,
    useJoinGroupMutation,
    useLeaveGroupMutation,
} from '@/api/calls/groupHooks';

// The selected group survives restarts, so the app opens on the group you used last.
const useStore = create<{
    selectedGroupId: string | null;
    selectGroup: (groupId: string | null) => void;
    /** false until the saved selection has been read from storage */
    hydrated: boolean;
}>()(
    persist(
        (set) => ({
            selectedGroupId: null,
            hydrated: false,

            selectGroup: (selectedGroupId) => {
                set({ selectedGroupId });
            },
        }),
        {
            name: 'selected-group',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ selectedGroupId: state.selectedGroupId }),
            onRehydrateStorage: () => () => {
                useStore.setState({ hydrated: true });
            },
        }
    )
);

/** The selected group's id, without the group list query and mutations of `useGroupStore`. */
export function useSelectedGroupId() {
    return useStore((s) => s.selectedGroupId);
}

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
 * Keeps a group selected: keeps the saved one, picks the first group when none (or a left one) is selected, and sends
 * users without any group to onboarding. Mounted once, in the app's stack layout; screens that
 * read the group store must not redirect on their own.
 */
export function useEnsureGroupSelected() {
    const { selectedGroupId, selectGroup, hydrated } = useStore();
    const myGroupsQuery = useGetMyGroupsQuery();

    const groups = myGroupsQuery.data?.data;
    // if this changes we either left, created, or joined a group.
    const groupsKey = groups?.map((i) => i.id).join();

    const ensureSelection = useEffectEvent(() => {
        // wait for the saved selection, or the first group would replace it
        if (!groups || !hydrated) return;
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
    }, [groupsKey, hydrated]);
}
