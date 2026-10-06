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
    /** experimental redesign of the main screens (Experimental Features → New Design) */
    newDesign: boolean;
    /** pro mode: a Miss button in live matches, so every throw is in the log */
    trackMisses: boolean;
    /** iOS: the group's live matches start a Live Activity on this phone */
    liveActivities: boolean;
    /** experimental: entering a point in a live match plays the scorer's clip in a toast */
    scoreClipToasts: boolean;

    actions: {
        toggleLiveMatches: () => void;
        toggleBeerpongProMode: () => void;

        togglePremiumVersion: () => void;
        toggleMatchPhotos: () => void;
        setTheme: (themeId: string) => void;
        toggleShowWallpaper: () => void;
        toggleScopedPlayerPage: () => void;
        toggleNewDesign: () => void;
        toggleTrackMisses: () => void;
        toggleLiveActivities: () => void;
        toggleScoreClipToasts: () => void;
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
            newDesign: false,
            trackMisses: false,
            liveActivities: true,
            scoreClipToasts: false,

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
                toggleNewDesign: () => {
                    set(() => ({ newDesign: !get().newDesign }));
                },
                toggleTrackMisses: () => {
                    set(() => ({ trackMisses: !get().trackMisses }));
                },
                toggleLiveActivities: () => {
                    set(() => ({ liveActivities: !get().liveActivities }));
                },
                toggleScoreClipToasts: () => {
                    set(() => ({ scoreClipToasts: !get().scoreClipToasts }));
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
                newDesign: state.newDesign,
                trackMisses: state.trackMisses,
                liveActivities: state.liveActivities,
                scoreClipToasts: state.scoreClipToasts,
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

/** Whether the experimental redesign is on; components pick their `next` variant with it. */
export function useNewDesign() {
    return useLocalSettingsStore((s) => s.newDesign);
}
