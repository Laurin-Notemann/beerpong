import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TutorialStore {
    hasDraggedToAssignPoints: boolean;
    hasTappedToAssignPlayers: boolean;

    actions: {
        setHasDraggedToAssignPoints: () => void;
        setHasTappedToAssignPlayers: () => void;

        reset: () => void;
    };
}

export const useTutorialStore = create<TutorialStore>()(
    persist(
        (set) => ({
            hasDraggedToAssignPoints: false,
            hasTappedToAssignPlayers: false,

            actions: {
                setHasDraggedToAssignPoints: () => {
                    set((state) =>
                        state.hasDraggedToAssignPoints
                            ? state
                            : { hasDraggedToAssignPoints: true }
                    );
                },
                setHasTappedToAssignPlayers: () => {
                    set((state) =>
                        state.hasTappedToAssignPlayers
                            ? state
                            : { hasTappedToAssignPlayers: true }
                    );
                },
                reset: () => {
                    set(() => ({
                        hasDraggedToAssignPoints: false,
                        hasTappedToAssignPlayers: false,
                    }));
                },
            },
        }),
        {
            name: 'tutorials',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                hasDraggedToAssignPoints: state.hasDraggedToAssignPoints,
                hasTappedToAssignPlayers: state.hasTappedToAssignPlayers,
            }),
        }
    )
);

export function useTutorials() {
    const { actions, ...values } = useTutorialStore();

    return {
        ...values,
        ...actions,
    };
}
