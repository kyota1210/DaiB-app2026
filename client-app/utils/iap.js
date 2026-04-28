// react-native-iap のラッパー。Expo Go では noop。
//
// 購入フロー:
//   1. await iapInit()
//   2. const products = await iapGetSubscriptions([PREMIUM_MONTHLY])
//   3. await iapRequestSubscription(productId)  → onPurchaseSuccess に transactionId が来る
//   4. transactionId を verifyIapReceipt に渡す
//   5. await iapFinishTransaction(purchase)
//
// 復元フロー:
//   1. const purchases = await iapGetAvailablePurchases()
//   2. 購読中のものを抽出 → verifyIapReceipt → finishTransaction

import { Platform } from 'react-native';

let RNIap = null;
try {
    RNIap = require('react-native-iap');
} catch (_) { /* Expo Go */ }

export const PREMIUM_MONTHLY_PRODUCT_ID =
    process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_PREMIUM_MONTHLY ||
    'com.kytm1210.daibapp2026.premium.monthly';

export const isIapAvailable = () => RNIap != null && Platform.OS === 'ios';

let connected = false;

export const iapInit = async () => {
    if (!isIapAvailable()) return false;
    if (connected) return true;
    try {
        await RNIap.initConnection();
        connected = true;
        return true;
    } catch (e) {
        console.warn('iap initConnection failed', e?.message);
        return false;
    }
};

export const iapEnd = async () => {
    if (!isIapAvailable() || !connected) return;
    try {
        await RNIap.endConnection();
    } catch (_) { /* noop */ }
    connected = false;
};

export const iapGetSubscriptions = async (skus = [PREMIUM_MONTHLY_PRODUCT_ID]) => {
    if (!isIapAvailable()) return [];
    try {
        return await RNIap.getSubscriptions({ skus });
    } catch (e) {
        console.warn('iap getSubscriptions failed', e?.message);
        return [];
    }
};

export const iapRequestSubscription = async (sku = PREMIUM_MONTHLY_PRODUCT_ID) => {
    if (!isIapAvailable()) throw new Error('iap_not_available');
    return await RNIap.requestSubscription({ sku });
};

export const iapGetAvailablePurchases = async () => {
    if (!isIapAvailable()) return [];
    try {
        return await RNIap.getAvailablePurchases();
    } catch (e) {
        console.warn('iap getAvailablePurchases failed', e?.message);
        return [];
    }
};

export const iapFinishTransaction = async (purchase, isConsumable = false) => {
    if (!isIapAvailable()) return;
    try {
        await RNIap.finishTransaction({ purchase, isConsumable });
    } catch (e) {
        console.warn('iap finishTransaction failed', e?.message);
    }
};

/**
 * 購入結果リスナーを追加する。Apple StoreKit から非同期にも届くため、
 * アプリ起動時にも一度仕込んでおくと安全。
 *
 * @param {(purchase: any) => void} onPurchase
 * @param {(error: any) => void} onError
 * @returns {() => void} unsubscribe
 */
export const iapAddPurchaseListeners = (onPurchase, onError) => {
    if (!isIapAvailable()) return () => {};
    const successSub = RNIap.purchaseUpdatedListener(onPurchase);
    const errorSub = RNIap.purchaseErrorListener(onError);
    return () => {
        try { successSub.remove(); } catch (_) { /* noop */ }
        try { errorSub.remove(); } catch (_) { /* noop */ }
    };
};

/**
 * StoreKit 1 / 2 の差異を吸収して originalTransactionId を取り出す。
 * react-native-iap 14 系ではどちらの値も含まれることが多い。
 */
export const extractOriginalTransactionId = (purchase) => {
    return (
        purchase?.originalTransactionIdentifierIOS ||
        purchase?.originalTransactionId ||
        purchase?.transactionId ||
        null
    );
};
