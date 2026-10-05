import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CupTeam } from '@/lib/cupHits';
import { Rerack } from '@/lib/rerack';

/**
 * The teams re-racked in the local draft (key 'draft'); a live match's re-racks are in its log
 * (SET_RERACK), so every phone and the TV see them. The formations themselves belong to the
 * group (see formationHooks).
 */
interface RerackStore {
    reracks: Record<string, Partial<Record<CupTeam, Rerack>>>;

    actions: {
        setRerack: (matchKey: string, team: CupTeam, rerack?: Rerack) => void;
    };
}

export const useRerackStore = create<RerackStore>()(
    persist(
        (set) => ({
            reracks: {},

            actions: {
                setRerack: (matchKey, team, rerack) =>
                    set((state) => ({
                        reracks: {
                            ...state.reracks,
                            [matchKey]: {
                                ...state.reracks[matchKey],
                                [team]: rerack,
                            },
                        },
                    })),
            },
        }),
        {
            name: 'reracks',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ reracks: state.reracks }),
        }
    )
);

/** the re-racks of the local draft */
export const useReracks = () => useRerackStore((s) => s.reracks.draft);
