import { create } from 'zustand';

export interface GroupMember {
    name: string;
}

interface GroupStore {
    members: GroupMember[];
    name: string | null;
    addMembers: (members: GroupMember[]) => void;
    addName: (name: string) => void;
}

export const useCreateGroupStore = create<GroupStore>((set) => ({
    members: [],
    name: null,
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
}));
