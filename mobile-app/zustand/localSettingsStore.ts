import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocalSettingsStore {
    liveMatches: boolean;
    beerpongProMode: boolean;
    matchPhotos: boolean;
    themeId: string;
    premiumVersion: boolean;
    showWallpaper: boolean;
    scopedPlayerPage: boolean;

    actions: {
        toggleLiveMatches: () => void;
        toggleBeerpongProMode: () => void;

        togglePremiumVersion: () => void;
        toggleMatchPhotos: () => void;
        setTheme: (themeId: string) => void;
        toggleShowWallpaper: () => void;
        toggleScopedPlayerPage: () => void;
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
            scopedPlayerPage: false,

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
                toggleScopedPlayerPage: () => {
                    set(() => ({
                        scopedPlayerPage: !get().scopedPlayerPage,
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

                premiumVersion: state.premiumVersion,
                matchPhotos: state.matchPhotos,
                themeId: state.themeId,
                showWallpaper: state.showWallpaper,
                scopedPlayerPage: state.scopedPlayerPage,
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
