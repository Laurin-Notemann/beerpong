import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocalSettingsStore {
    liveMatches: boolean;
    beerpongProMode: boolean;
    rulesTab: boolean;
    supportAdditionalGames: boolean;
    tutorials: boolean;
    eloAlgorithm: boolean;
    premiumVersion: boolean;

    actions: {
        toggleLiveMatches: () => void;
        toggleBeerpongProMode: () => void;
        toggleRulesTab: () => void;
        toggleSupportAdditionalGames: () => void;
        toggleTutorials: () => void;
        toggleEloAlgorithm: () => void;
        togglePremiumVersion: () => void;
    };
}

export const useLocalSettingsStore = create<LocalSettingsStore>()(
    persist(
        (set, get) => ({
            liveMatches: false,
            beerpongProMode: false,
            rulesTab: false,
            supportAdditionalGames: false,
            tutorials: false,
            eloAlgorithm: false,
            premiumVersion: false,

            actions: {
                toggleLiveMatches: () => {
                    set(() => ({
                        liveMatches: !get().liveMatches,
                    }));
                },
                toggleBeerpongProMode: () => {
                    set(() => ({
                        beerpongProMode: !get().beerpongProMode,
                    }));
                },
                toggleRulesTab: () => {
                    set(() => ({
                        rulesTab: !get().rulesTab,
                    }));
                },
                toggleSupportAdditionalGames: () => {
                    set(() => ({
                        supportAdditionalGames: !get().supportAdditionalGames,
                    }));
                },
                toggleTutorials: () => {
                    set(() => ({
                        tutorials: !get().tutorials,
                    }));
                },
                toggleEloAlgorithm: () => {
                    set(() => ({
                        eloAlgorithm: !get().eloAlgorithm,
                    }));
                },
                togglePremiumVersion: () => {
                    set(() => ({
                        premiumVersion: !get().premiumVersion,
                    }));
                },
            },
        }),
        {
            name: 'local-settings',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                liveMatches: state.liveMatches,
                beerpongProMode: state.beerpongProMode,
                rulesTab: state.rulesTab,
                supportAdditionalGames: state.supportAdditionalGames,
                tutorials: state.tutorials,
                eloAlgorithm: state.eloAlgorithm,
                premiumVersion: state.premiumVersion,
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
