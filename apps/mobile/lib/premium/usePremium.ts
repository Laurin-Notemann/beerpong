import { useQuery } from '@tanstack/react-query';
import {
    getAvailablePurchases,
    isUserCancelledError,
    Purchase,
    purchaseErrorListener,
    purchaseUpdatedListener,
    requestPurchase,
    restorePurchases,
} from 'expo-iap';
import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';

import { useRedeemPurchaseMutation } from '@/api/calls/premiumHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import {
    connectStore,
    fetchPremiumProduct,
    isPremiumPurchase,
    PREMIUM_PRODUCT_ID,
    premiumLogger,
    redeemAndFinish,
} from '@/lib/premium/store';
import { showErrorToast, showSuccessToast } from '@/toast';
import { useSelectedGroupId } from '@/zustand/group/stateGroupStore';
import { usePremiumStore } from '@/zustand/premiumStore';

/**
 * Whether the selected group has Versus Premium, from the cached group. A
 * group cached before premium existed has no `premium` and counts as without
 * an entitlement. Features stay available while the stores are being set up.
 */
export function useGroupPremium() {
    const { group } = useGroup();
    return group?.data?.premium === true;
}

/**
 * Mounted once, in the main layout. Sends every store purchase of premium to
 * the API: the one just bought (it also unlocks the group it was bought in),
 * one interrupted before the API had it, and on a new install the purchase
 * the store account already owns.
 */
export function usePremiumSync() {
    const selectedGroupId = useSelectedGroupId();
    const { group } = useGroup();
    const groupLoaded = !!group?.data;
    const { mutateAsync: redeem } = useRedeemPurchaseMutation();
    const { markRedeemed, setBuyingIn } = usePremiumStore((s) => s.actions);

    const onPurchase = useEffectEvent(async (purchase: Purchase) => {
        if (purchase.productId !== PREMIUM_PRODUCT_ID) return;
        const buyingIn = usePremiumStore.getState().buyingIn;
        if (purchase.purchaseState === 'pending') {
            setBuyingIn(null);
            showSuccessToast(
                'Your purchase is pending. Premium unlocks once it is paid.'
            );
            return;
        }
        if (!isPremiumPurchase(purchase)) return;
        const groupId = buyingIn ?? selectedGroupId;
        if (!groupId) return;
        try {
            await redeemAndFinish(redeem, purchase, groupId, !!buyingIn);
            markRedeemed(purchase.id);
            if (buyingIn) showSuccessToast('Premium unlocked!');
        } catch (err) {
            // without a buyer waiting it's a retry at launch, often offline
            if (!buyingIn) {
                premiumLogger.warn('failed to redeem purchase', err);
            } else {
                premiumLogger.error('failed to redeem purchase', err);
                showErrorToast(
                    'Couldn’t unlock premium. Versus tries again on the next start.',
                    err
                );
            }
        } finally {
            if (buyingIn) setBuyingIn(null);
        }
    });

    const onPurchaseError = useEffectEvent((error: unknown) => {
        setBuyingIn(null);
        if (isUserCancelledError(error)) return;
        premiumLogger.warn('purchase failed', error);
        showErrorToast('The purchase didn’t go through.', error);
    });

    useEffect(() => {
        const updates = purchaseUpdatedListener((p) => void onPurchase(p));
        const errors = purchaseErrorListener((e) => onPurchaseError(e));
        connectStore().catch((err) =>
            premiumLogger.info('no store connection', err)
        );
        return () => {
            updates.remove();
            errors.remove();
        };
    }, []);

    // the store account's purchase on a new install, or one Google wants
    // acknowledged; once per purchase and install
    const syncStorePurchases = useEffectEvent(async (groupId: string) => {
        await connectStore();
        const { redeemed } = usePremiumStore.getState();
        for (const purchase of await getAvailablePurchases()) {
            if (!isPremiumPurchase(purchase)) continue;
            const unacknowledged =
                Platform.OS === 'android' &&
                'isAcknowledgedAndroid' in purchase &&
                purchase.isAcknowledgedAndroid === false;
            if (redeemed.includes(purchase.id) && !unacknowledged) continue;
            await redeemAndFinish(redeem, purchase, groupId, false);
            markRedeemed(purchase.id);
        }
    });

    useEffect(() => {
        if (!selectedGroupId || !groupLoaded) return;
        syncStorePurchases(selectedGroupId).catch((err) =>
            premiumLogger.info('store purchases not synced', err)
        );
    }, [selectedGroupId, groupLoaded]);
}

/** The premium product with its price in the user's currency. */
export function usePremiumProduct() {
    return useQuery({
        queryKey: ['premiumProduct'],
        queryFn: fetchPremiumProduct,
        staleTime: 60 * 60 * 1000,
        retry: false,
    });
}

/** Buy and Restore on the paywall. The purchase itself lands in usePremiumSync. */
export function usePremiumActions(groupId: string | null) {
    const buying = usePremiumStore((s) => s.buyingIn !== null);
    const { setBuyingIn, markRedeemed } = usePremiumStore((s) => s.actions);
    const { mutateAsync: redeem, isPending: restoring } =
        useRedeemPurchaseMutation();

    async function buy() {
        if (!groupId) return;
        setBuyingIn(groupId);
        try {
            await connectStore();
            await requestPurchase({
                request: {
                    apple: { sku: PREMIUM_PRODUCT_ID },
                    google: { skus: [PREMIUM_PRODUCT_ID] },
                },
                type: 'in-app',
            });
        } catch (err) {
            setBuyingIn(null);
            if (isUserCancelledError(err)) return;
            premiumLogger.warn('purchase failed to start', err);
            showErrorToast('The purchase didn’t go through.', err);
        }
    }

    async function restore() {
        if (!groupId) return;
        try {
            await connectStore();
            await restorePurchases();
            const purchase = (await getAvailablePurchases()).find(
                isPremiumPurchase
            );
            if (!purchase) {
                showErrorToast(
                    Platform.OS === 'ios'
                        ? 'This Apple ID hasn’t bought Versus Premium.'
                        : 'This Google account hasn’t bought Versus Premium.'
                );
                return;
            }
            await redeemAndFinish(redeem, purchase, groupId, false);
            markRedeemed(purchase.id);
            showSuccessToast(
                'Restored. Premium covers the groups you created and the ones you bought it in.'
            );
        } catch (err) {
            premiumLogger.warn('restore failed', err);
            showErrorToast('Couldn’t restore your purchase.', err);
        }
    }

    return { buy, restore, buying, restoring };
}
