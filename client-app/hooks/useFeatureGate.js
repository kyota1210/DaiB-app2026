// 機能ゲート（Plus プラン特典）の判定をまとめるフック。
// Plus プラン未契約時の上限値はここで一元管理する。

import { useSubscription } from '../context/SubscriptionContext';

/** 無料プランの上限（表示・ゲートで共有） */
export const FREE_LIMITS = {
    monthlyPostCount: 30,
    storageBytes: 200 * 1024 * 1024, // 200MB（参考値、バックエンド側でも別途制限予定）
    /** 無料プランで作成できるカスタムカテゴリー数（「すべて」相当の仮想カテゴリーは含まない） */
    maxCustomCategories: 3,
};

export const useFeatureGate = () => {
    const { isPremium } = useSubscription();

    return {
        isPremium,

        canSeeDetailedStats: isPremium,
        adsHidden: isPremium,

        getMonthlyPostLimit: () => (isPremium ? Infinity : FREE_LIMITS.monthlyPostCount),
        getStorageBytesLimit: () => (isPremium ? Infinity : FREE_LIMITS.storageBytes),

        canCreateMorePosts: (currentMonthCount) => {
            if (isPremium) return true;
            return (currentMonthCount ?? 0) < FREE_LIMITS.monthlyPostCount;
        },

        getCustomCategoryLimit: () => (isPremium ? Infinity : FREE_LIMITS.maxCustomCategories),

        /** @param {number} currentCustomCount 「すべて」以外のカテゴリー数 */
        canCreateMoreCategories: (currentCustomCount) => {
            if (isPremium) return true;
            return (currentCustomCount ?? 0) < FREE_LIMITS.maxCustomCategories;
        },
    };
};
