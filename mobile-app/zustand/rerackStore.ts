import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CupTeam } from '@/lib/cupHits';
import { Rerack } from '@/lib/rerack';

/**
 * The teams this phone re-racked, per match ('draft' or a live match id). The formations
 * themselves belong to the group (see formationHooks).
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

/** the re-racks of the match being entered: a live match, or the local draft */
export const useReracks = (liveMatchId?: string) =>
    useRerackStore((s) => s.reracks[liveMatchId ?? 'draft']);
