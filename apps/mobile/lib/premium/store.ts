import {
    fetchProducts,
    finishTransaction,
    initConnection,
    Product,
    Purchase,
} from 'expo-iap';

import { errorCode } from '@/lib/liveMatch/sync';
import { ScopedLogger } from '@/utils/logging';

/** Versus Premium's product ID, the same in App Store Connect and the Play Console */
export const PREMIUM_PRODUCT_ID = 'premium';

export const premiumLogger = new ScopedLogger('premium');

let connection: Promise<boolean> | null = null;

/**
 * Connects to the App Store or Google Play once per app run. Fails in builds
 * the store doesn't serve (for example a simulator without StoreKit);
 * the next call tries again.
 */
export function connectStore() {
    connection ??= initConnection().catch((err: unknown) => {
        connection = null;
        throw err;
    });
    return connection;
}

export async function fetchPremiumProduct(): Promise<Product | null> {
    await connectStore();
    const products = await fetchProducts({
        skus: [PREMIUM_PRODUCT_ID],
        type: 'in-app',
    });
    return (
        (products as Product[] | null)?.find(
            (p) => p.id === PREMIUM_PRODUCT_ID
        ) ?? null
    );
}

export function isPremiumPurchase(purchase: Purchase) {
    return (
        purchase.productId === PREMIUM_PRODUCT_ID &&
        purchase.purchaseState === 'purchased'
    );
}

/**
 * Sends the purchase to the API, then finishes it in the store. An unfinished
 * purchase comes back on the next launch, and Google refunds one that isn't
 * finished within 3 days, so it's only finished once the API has it, or when
 * the API will never take it (refunded, not ours).
 */
export async function redeemAndFinish(
    redeem: (args: {
        groupId: string;
        token: string;
        unlockGroup: boolean;
    }) => Promise<unknown>,
    purchase: Purchase,
    groupId: string,
    unlockGroup: boolean
) {
    if (!purchase.purchaseToken) {
        premiumLogger.warn('purchase without a token', purchase.id);
        return;
    }
    try {
        await redeem({ groupId, token: purchase.purchaseToken, unlockGroup });
    } catch (err) {
        if (errorCode(err) !== 'purchaseInvalid') throw err;
        premiumLogger.warn('the API rejected purchase', purchase.id);
    }
    await finishTransaction({ purchase, isConsumable: false });
}
