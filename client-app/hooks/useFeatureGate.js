// 機能ゲート（プレミアム特典）の判定をまとめるフック。
// プレミアム未契約時の上限値はここで一元管理する。

import { useSubscription } from '../context/SubscriptionContext';

const FREE_LIMITS = {
    monthlyPostCount: 30,
    storageBytes: 200 * 1024 * 1024, // 200MB（参考値、バックエンド側でも別途制限予定）
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
    };
};
