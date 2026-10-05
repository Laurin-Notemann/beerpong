import { create } from 'zustand';

export interface GroupMember {
    name: string;
}

interface GroupStore {
    members: GroupMember[];
    name: string | null;
    addMembers: (members: GroupMember[]) => void;
    addName: (name: string) => void;

    sport: { preset?: string; custom?: { name: string } } | null;

    setSport: (
        sport: { preset: string } | { custom: { name: string } } | null
    ) => void;

    setSportCustomName: (name: string) => void;
}

export const useCreateGroupStore = create<GroupStore>((set) => ({
    members: [],
    name: null,
    sport: null,
    addMembers: (members) => {
        set(() => ({
            members,
        }));
    },
    addName: (name) => {
        set(() => ({
            name,
        }));
    },
    setSport: (sport) => {
        set(() => ({
            sport,
        }));
    },
    setSportCustomName: (name) => {
        set((state) => ({
            sport: { custom: { name } },
        }));
    },
}));
