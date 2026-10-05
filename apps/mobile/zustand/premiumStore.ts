import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PremiumStore {
    /** store purchases (`Purchase.id`) this install sent to the API, so the launch sync sends each once */
    redeemed: string[];
    /** the group a purchase was started in, until the store answers; the purchase unlocks it */
    buyingIn: string | null;

    actions: {
        markRedeemed: (purchaseId: string) => void;
        setBuyingIn: (groupId: string | null) => void;
    };
}

export const usePremiumStore = create<PremiumStore>()(
    persist(
        (set, get) => ({
            redeemed: [],
            buyingIn: null,
            actions: {
                markRedeemed: (purchaseId) => {
                    if (get().redeemed.includes(purchaseId)) return;
                    set({ redeemed: [...get().redeemed, purchaseId] });
                },
                setBuyingIn: (buyingIn) => set({ buyingIn }),
            },
        }),
        {
            name: 'premium',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ redeemed: state.redeemed }),
        }
    )
);
