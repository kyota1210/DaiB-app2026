// 機能ゲート（Plus プラン特典）の判定をまとめるフック。
// Plus プラン未契約時の上限値は constants/subscription.js で一元管理する。
// （supabaseData.js からも参照するため、循環依存を避けるために独立ファイルに分離）

import { useSubscription } from '../context/SubscriptionContext';
import { FREE_LIMITS } from '../constants/subscription';

export { FREE_LIMITS };

export const useFeatureGate = () => {
    const { isPremium } = useSubscription();

    return {
        isPremium,

        canSeeDetailedStats: isPremium,

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
