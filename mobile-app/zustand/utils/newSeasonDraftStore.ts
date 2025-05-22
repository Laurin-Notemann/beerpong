import { create } from 'zustand';

interface MoveInput {
    id: string;
    name: string;
    finishingMove: boolean;
    pointsForScorer: number;
    pointsForTeam: number;
}

interface NewSeasonDraftStore {
    oldSeasonName: string;

    newSeasonAllowedMoves: MoveInput[];

    actions: {
        setOldSeasonName: (oldSeasonName: string) => void;
        setNewSeasonAllowedMoves: (
            newSeasonAllowedMoves: Omit<MoveInput, 'id'>[]
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
