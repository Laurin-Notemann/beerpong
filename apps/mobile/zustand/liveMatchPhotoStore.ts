import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DualCameraPhoto } from '@/components/DualCameraView';

/**
 * Team photos taken during a live match, per live match id. A live match has no photos on the
 * server, so the phone that took one keeps it until the match is finished and then attaches it
 * to the match (see useLiveMatchScreen).
 */
interface LiveMatchPhotoStore {
    photos: Record<string, DualCameraPhoto>;
    actions: {
        set: (liveMatchId: string, photos: DualCameraPhoto | null) => void;
    };
}

export const useLiveMatchPhotoStore = create<LiveMatchPhotoStore>()(
    persist(
        (set) => ({
            photos: {},
            actions: {
                set: (liveMatchId, photos) =>
                    set((state) => {
                        const next = { ...state.photos };
                        if (photos) next[liveMatchId] = photos;
                        else delete next[liveMatchId];
                        return { photos: next };
                    }),
            },
        }),
        {
            name: 'live-match-photos',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ photos: state.photos }),
        }
    )
);
