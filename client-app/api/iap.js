import { supabase } from '../utils/supabase';

/**
 * 購入完了 / 復元時にレシート（originalTransactionId）を Supabase Edge Function に送り、
 * subscriptions テーブルを最新状態に更新させる。
 *
 * @param {{ originalTransactionId: string, productId?: string }} params
 * @returns {Promise<{ ok: boolean, status: string, expiresAt?: string|null, productId?: string, autoRenew?: boolean }>}
 */
export const verifyIapReceipt = async ({ originalTransactionId, productId }) => {
    if (!originalTransactionId) {
        throw new Error('missing_original_transaction_id');
    }
    const { data, error } = await supabase.functions.invoke('verify-iap-receipt', {
        method: 'POST',
        body: { originalTransactionId, productId },
    });
    if (error) {
        const code =
            error?.context?.json?.error ||
            error.message ||
            'verify_failed';
        throw new Error(code);
    }
    return data ?? { ok: true };
};

/**
 * subscriptions テーブルから自分の状態を取得する。
 * RLS により本人の行のみ返る。
 */
export const fetchMySubscription = async () => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('store, product_id, status, auto_renew, expires_at, last_verified_at')
        .maybeSingle();
    if (error) throw error;
    return data;
};
