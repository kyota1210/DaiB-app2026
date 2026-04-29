// RevenueCat（react-native-purchases）の薄いラッパー。Expo Go ではネイティブモジュール無し → noop。
//
// Webhook で subscriptions が更新される前提。購入・復元後は SubscriptionContext.refresh() で DB を再読込する。
//
// フロー:
//   1. purchasesConfigure()（アプリ起動時に1回）
//   2. purchasesLogIn(supabaseUserId)（ログイン時 — app_user_id を JWT の user id と一致させる）
//   3. purchasesGetMonthlyPackage() → purchasesPurchasePackage / purchasesRestore

import { Platform } from 'react-native';

let Purchases = null;
try {
    Purchases = require('react-native-purchases').default;
} catch {
    /* Expo Go */
}

export const PREMIUM_MONTHLY_PRODUCT_ID =
    process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_PREMIUM_MONTHLY ||
    'com.kytm1210.daibapp2026.premium.monthly';

let configured = false;

export const isPurchasesAvailable = () =>
    Purchases != null && (Platform.OS === 'ios' || Platform.OS === 'android');

/**
 * @returns {Promise<boolean>}
 */
export const purchasesConfigure = async () => {
    if (!isPurchasesAvailable()) return false;
    if (configured) return true;
    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    const apiKey = Platform.OS === 'ios' ? iosKey : androidKey;
    if (!apiKey) {
        console.warn('RevenueCat: missing EXPO_PUBLIC_REVENUECAT_*_API_KEY');
        return false;
    }
    try {
        Purchases.configure({ apiKey });
        configured = true;
        return true;
    } catch (e) {
        console.warn('RevenueCat configure failed', e?.message);
        return false;
    }
};

/**
 * @param {string} userId - Supabase auth user id (UUID)
 */
export const purchasesLogIn = async (userId) => {
    if (!userId || !isPurchasesAvailable()) return;
    await purchasesConfigure();
    if (!configured) return;
    try {
        await Purchases.logIn(userId);
    } catch (e) {
        console.warn('RevenueCat logIn failed', e?.message);
    }
};

export const purchasesLogOut = async () => {
    if (!isPurchasesAvailable() || !configured) return;
    try {
        await Purchases.logOut();
    } catch (e) {
        console.warn('RevenueCat logOut failed', e?.message);
    }
};

/**
 * 現在の Offering から月額プレミアムの Package を返す。
 * @returns {Promise<import('react-native-purchases').PurchasesPackage | null>}
 */
export const purchasesGetMonthlyPackage = async () => {
    if (!isPurchasesAvailable()) return null;
    await purchasesConfigure();
    if (!configured) return null;
    try {
        const offerings = await Purchases.getOfferings();
        const current = offerings?.current;
        const pkgs = current?.availablePackages ?? [];
        const match = pkgs.find((p) => p?.product?.identifier === PREMIUM_MONTHLY_PRODUCT_ID);
        return match ?? pkgs[0] ?? null;
    } catch (e) {
        console.warn('RevenueCat getOfferings failed', e?.message);
        return null;
    }
};

/**
 * @param {import('react-native-purchases').PurchasesPackage} pkg
 * @returns {Promise<{ customerInfo: object }>}
 */
export const purchasesPurchasePackage = async (pkg) => {
    if (!pkg || !isPurchasesAvailable()) throw new Error('purchases_not_available');
    await purchasesConfigure();
    if (!configured) throw new Error('purchases_not_configured');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo };
};

export const purchasesRestorePurchases = async () => {
    if (!isPurchasesAvailable()) throw new Error('purchases_not_available');
    await purchasesConfigure();
    if (!configured) throw new Error('purchases_not_configured');
    const customerInfo = await Purchases.restorePurchases();
    return { customerInfo };
};

/**
 * 商品表示用（Package が無いときのフォールバック）
 * @returns {Promise<{ priceString?: string, identifier?: string } | null>}
 */
export const purchasesGetProductInfoForDisplay = async () => {
    const pkg = await purchasesGetMonthlyPackage();
    if (!pkg?.product) return null;
    return {
        priceString: pkg.product.priceString,
        identifier: pkg.product.identifier,
    };
};
