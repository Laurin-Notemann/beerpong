import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocalSettingsStore {
    experimentalImprovedMatchCreation: boolean;
    liveMatches: boolean;

    actions: {
        toggleExperimentalImprovedMatchCreation: () => void;
        toggleLiveMatches: () => void;
    };
}

export const useLocalSettingsStore = create<LocalSettingsStore>()(
    persist(
        (set, get) => ({
            experimentalImprovedMatchCreation: false,
            liveMatches: false,

            actions: {
                toggleExperimentalImprovedMatchCreation: () => {
                    set(() => ({
                        experimentalImprovedMatchCreation:
                            !get().experimentalImprovedMatchCreation,
                    }));
                },
                toggleLiveMatches: () => {
                    set(() => ({
                        liveMatches: !get().liveMatches,
                    }));
                },
            },
        }),
        {
            name: 'local-settings',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                experimentalImprovedMatchCreation:
                    state.experimentalImprovedMatchCreation,
            }),
        }
    )
);

export function useLocalSettings() {
    const { actions, ...values } = useLocalSettingsStore();

    return {
        ...values,
        ...actions,
    };
}
