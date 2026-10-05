import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CupPosition, CupTeam } from '@/lib/cupHits';
import { Rerack } from '@/lib/rerack';

/** a formation saved on this phone, on the cup grid's 7x7 points */
export interface SavedFormation {
    id: string;
    name: string;
    cups: CupPosition[];
}

const DEFAULT_FORMATIONS: SavedFormation[] = [
    {
        id: 'pyramid-6',
        name: 'Pyramid',
        cups: [
            { x: 1, y: 2 },
            { x: 3, y: 2 },
            { x: 5, y: 2 },
            { x: 2, y: 4 },
            { x: 4, y: 4 },
            { x: 3, y: 6 },
        ],
    },
    {
        id: 'triangle-3',
        name: 'Triangle',
        cups: [
            { x: 2, y: 4 },
            { x: 4, y: 4 },
            { x: 3, y: 6 },
        ],
    },
];

interface FormationStore {
    formations: SavedFormation[];
    /** per match ('draft' or a live match id), the teams this phone re-racked */
    reracks: Record<string, Partial<Record<CupTeam, Rerack>>>;

    actions: {
        save: (formation: SavedFormation) => void;
        remove: (id: string) => void;
        setRerack: (matchKey: string, team: CupTeam, rerack?: Rerack) => void;
    };
}

export const useFormationStore = create<FormationStore>()(
    persist(
        (set) => ({
            formations: DEFAULT_FORMATIONS,
            reracks: {},

            actions: {
                save: (formation) =>
                    set((state) => ({
                        formations: state.formations.some(
                            (i) => i.id === formation.id
                        )
                            ? state.formations.map((i) =>
                                  i.id === formation.id ? formation : i
                              )
                            : [...state.formations, formation],
                    })),
                remove: (id) =>
                    set((state) => ({
                        formations: state.formations.filter((i) => i.id !== id),
                    })),
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
            name: 'formations',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                formations: state.formations,
                reracks: state.reracks,
            }),
        }
    )
);

/** the re-racks of the match being entered: a live match, or the local draft */
export const useReracks = (liveMatchId?: string) =>
    useFormationStore((s) => s.reracks[liveMatchId ?? 'draft']);
