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
    showWallpaper: boolean;
    dailyLeaderboard: boolean;

    actions: {
        toggleLiveMatches: () => void;
        toggleBeerpongProMode: () => void;
        toggleRulesTab: () => void;
        toggleTutorials: () => void;
        toggleEloAlgorithm: () => void;
        togglePremiumVersion: () => void;
        toggleMatchPhotos: () => void;
        setTheme: (themeId: string) => void;
        toggleShowWallpaper: () => void;
        toggleDailyLeaderboard: () => void;
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
            showWallpaper: false,
            dailyLeaderboard: false,

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
                toggleShowWallpaper: () => {
                    set(() => ({
                        showWallpaper: !get().showWallpaper,
                    }));
                },
                toggleDailyLeaderboard: () => {
                    set(() => ({
                        dailyLeaderboard: !get().dailyLeaderboard,
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
                showWallpaper: state.showWallpaper,
                dailyLeaderboard: state.dailyLeaderboard,
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
