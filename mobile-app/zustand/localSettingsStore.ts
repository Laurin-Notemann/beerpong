import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocalSettingsStore {
    liveMatches: boolean;
    beerpongProMode: boolean;
    rulesTab: boolean;
    tutorials: boolean;
    eloAlgorithm: boolean;
    premiumVersion: boolean;
    matchPhotos: boolean;
    themeId: string;

    actions: {
        toggleLiveMatches: () => void;
        toggleBeerpongProMode: () => void;
        toggleRulesTab: () => void;
        toggleTutorials: () => void;
        toggleEloAlgorithm: () => void;
        togglePremiumVersion: () => void;
        toggleMatchPhotos: () => void;
        setTheme: (themeId: string) => void;
    };
}

export const useLocalSettingsStore = create<LocalSettingsStore>()(
    persist(
        (set, get) => ({
            liveMatches: false,
            beerpongProMode: false,
            rulesTab: false,
            tutorials: false,
            eloAlgorithm: false,
            premiumVersion: false,
            matchPhotos: false,
            themeId: 'dark',

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
                toggleMatchPhotos: () => {
                    set(() => ({
                        matchPhotos: !get().matchPhotos,
                    }));
                },
                setTheme: (themeId: string) => {
                    set(() => ({
                        themeId,
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
                tutorials: state.tutorials,
                eloAlgorithm: state.eloAlgorithm,
                premiumVersion: state.premiumVersion,
                matchPhotos: state.matchPhotos,
                themeId: state.themeId,
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
