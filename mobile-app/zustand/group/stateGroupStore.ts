import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface GroupState {
    // State
    groupIds: string[];
    selectedGroupId: string | null;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;

    // Basic CRUD
    addGroup: (groupId: string) => void;
    removeGroup: (groupId: string) => void;
    clearGroups: () => void;

    // Selection
    selectGroup: (groupId: string | null) => void;
    getSelectedGroupId: () => string | null;

    // Utility
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
}

export const useGroupStore = create<GroupState>()(
    persist(
        (set, get) => ({
            // Initial state
            groupIds: [],
            selectedGroupId: null,
            isLoading: false,
            error: null,
            lastUpdated: null,

            // Initialize the store
            initialize: async () => {
                set({ isLoading: false, error: null });
            },

            // Add a new group
            addGroup: (groupId) => {
                set((state) => ({
                    groupIds: [...state.groupIds, groupId],
                    selectedGroupId: groupId,
                    lastUpdated: Date.now(),
                    error: null,
                }));
            },

            // Remove a group
            removeGroup: (groupId) => {
                set((state) => ({
                    groupIds: state.groupIds.filter(
                        (group) => group !== groupId
                    ),
                    selectedGroupId:
                        state.selectedGroupId === groupId
                            ? null
                            : state.selectedGroupId,
                    lastUpdated: Date.now(),
                    error: null,
                }));
            },

            // Clear all groups
            clearGroups: () => {
                set({
                    groupIds: [],
                    selectedGroupId: null,
                    lastUpdated: Date.now(),
                    error: null,
                });
            },

            // Select a group
            selectGroup: (groupId) => {
                if (
                    groupId === null ||
                    get().groupIds.some((g) => g === groupId)
                ) {
                    set({ selectedGroupId: groupId, error: null });
                } else {
                    set({ error: 'Invalid group selection' });
                }
            },

            // Get selected group
            getSelectedGroupId: () => {
                const state = get();
                return (
                    state.groupIds.find((g) => g === state.selectedGroupId) ||
                    null
                );
            },

            // Utility functions
            setError: (error) => set({ error }),
            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'group-storage', // name of the item in storage
            storage: createJSONStorage(() => AsyncStorage), // AsyncStorage for React Native
            partialize: (state) => ({
                // Only persist these fields
                groupIds: state.groupIds,
                selectedGroupId: state.selectedGroupId,
            }),
        }
    )
);
