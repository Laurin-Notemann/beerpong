import { create } from 'zustand';

interface StoreRule {
    id: string;
    title: string;
    description: string;
}

interface EditRulesStore {
    isDirty: boolean;
    rules: StoreRule[];

    actions: {
        initialize: (rules: StoreRule[]) => void;
        setRuleTitle: (ruleId: string, title: string) => void;
        setRuleDescription: (ruleId: string, description: string) => void;
        deleteRule: (ruleId: string) => void;
    };
}

export const useEditRulesStore = create<EditRulesStore>()((set, get) => ({
    isDirty: false,
    rules: [],

    actions: {
        initialize: (rules) => {
            set(() => ({
                rules,
                isDirty: false,
            }));
        },
        setRuleTitle: (ruleId, title) => {
            set((state) => ({
                rules: state.rules.map((rule) =>
                    rule.id === ruleId ? { ...rule, title } : rule
                ),
                isDirty: true,
            }));
        },
        setRuleDescription: (ruleId, description) => {
            set((state) => ({
                rules: state.rules.map((rule) =>
                    rule.id === ruleId ? { ...rule, description } : rule
                ),
                isDirty: true,
            }));
        },
        deleteRule: (ruleId) => {
            set((state) => ({
                rules: state.rules.filter((rule) => rule.id !== ruleId),
                isDirty: true,
            }));
        },
    },
}));
