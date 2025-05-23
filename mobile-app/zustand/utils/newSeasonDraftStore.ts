import { create } from 'zustand';

export interface NewSeasonMoveInput {
    id: string;
    name: string;
    finishingMove: boolean;
    pointsForScorer: number;
    pointsForTeam: number;
}

interface NewSeasonDraftStore {
    oldSeasonName: string;

    newSeasonAllowedMoves: NewSeasonMoveInput[];

    actions: {
        setOldSeasonName: (oldSeasonName: string) => void;
        setNewSeasonAllowedMoves: (
            newSeasonAllowedMoves: Omit<NewSeasonMoveInput, 'id'>[]
        ) => void;

        clear: () => void;
    };
}

const useNewSeasonDraftStore = create<NewSeasonDraftStore>()((set) => ({
    oldSeasonName: '',
    newSeasonAllowedMoves: [],

    actions: {
        setOldSeasonName: (oldSeasonName) => {
            set(() => ({
                oldSeasonName,
            }));
        },
        setNewSeasonAllowedMoves: (newSeasonAllowedMoves) => {
            set(() => ({
                newSeasonAllowedMoves: newSeasonAllowedMoves.map((i, idx) => ({
                    ...i,
                    id: idx.toString(),
                })),
            }));
        },
        clear: () => {
            set(() => ({
                oldSeasonName: '',
                newSeasonAllowedMoves: [],
            }));
        },
    },
}));

export const useNewSeasonDraft = useNewSeasonDraftStore;
