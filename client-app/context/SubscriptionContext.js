// SubscriptionContext: プレミアム購読状態をアプリ全体に提供する。
//
// - `userToken` が変化したら自動で `subscriptions` テーブルから状態を読み直す。
// - `refresh()` で明示再取得（IAP 購入直後に呼ぶ）。
// - DB 側の `is_current_user_premium()` RPC を真とし、ローカルの `expires_at` は表示用。

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { supabase } from '../utils/supabase';

const SubscriptionContext = createContext(null);

const isActiveStatus = (status) =>
    status === 'active' || status === 'in_grace_period' || status === 'in_billing_retry';

export const SubscriptionProvider = ({ children }) => {
    const auth = useContext(AuthContext);
    const userToken = auth?.userToken;

    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchSubscription = useCallback(async () => {
        if (!userToken) {
            setSubscription(null);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('store, product_id, status, auto_renew, expires_at, last_verified_at')
                .maybeSingle();
            if (error) throw error;
            setSubscription(data || null);
        } catch (e) {
            console.warn('fetch subscription failed', e?.message);
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    }, [userToken]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const refresh = useCallback(async () => {
        await fetchSubscription();
    }, [fetchSubscription]);

    const isPremium = useMemo(() => {
        if (!subscription) return false;
        if (!isActiveStatus(subscription.status)) return false;
        if (!subscription.expires_at) return true; // 無期限/未設定はアクティブ扱い
        return new Date(subscription.expires_at).getTime() > Date.now();
    }, [subscription]);

    const value = useMemo(
        () => ({
            isPremium,
            loading,
            status: subscription?.status ?? null,
            productId: subscription?.product_id ?? null,
            autoRenew: subscription?.auto_renew ?? null,
            expiresAt: subscription?.expires_at ?? null,
            refresh,
        }),
        [isPremium, loading, subscription, refresh],
    );

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
    const ctx = useContext(SubscriptionContext);
    if (!ctx) {
        return {
            isPremium: false,
            loading: false,
            status: null,
            productId: null,
            autoRenew: null,
            expiresAt: null,
            refresh: async () => {},
        };
    }
    return ctx;
};
