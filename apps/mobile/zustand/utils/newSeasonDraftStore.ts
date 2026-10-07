import { create } from 'zustand';

export interface NewSeasonMoveInput {
    id: string;
    name: string;
    finishingMove: boolean;
    pointsForScorer: number;
    pointsForTeam: number;
    /** cups one hit takes off the table */
    cups: number;
    /** what a pro mode quick hit counts as; one move at most, never a finish */
    defaultMove: boolean;
}

interface NewSeasonDraftStore {
    oldSeasonName: string;

    newSeasonAllowedMoves: NewSeasonMoveInput[];

    actions: {
        setOldSeasonName: (oldSeasonName: string) => void;
        setNewSeasonAllowedMoves: (
            newSeasonAllowedMoves: NewSeasonMoveInput[]
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
                newSeasonAllowedMoves,
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
