// Supabase Edge Function: verify-iap-receipt
//
// クライアント（react-native-iap）から送られてくる originalTransactionId（StoreKit 2 では
// transactionId / Transaction.original.id）を Apple App Store Server API に問い合わせ、
// 本人のサブスクリプション状態を取得 → public.subscriptions に upsert する。
//
// クライアント側は、購入完了 / 復元時に最新の transactionId を渡せば良い。
// 旧 verifyReceipt API （JSON receipt 送信）は廃止予定のため使わない。
//
// リクエスト:
//   POST /functions/v1/verify-iap-receipt
//   Authorization: Bearer <user JWT>
//   Body: { "originalTransactionId": "..." , "productId": "..." }
//
// レスポンス:
//   200 { ok: true, status: '...', expiresAt: '...' }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
    fetchSubscriptionStatuses,
    decodeJws,
    mapAppleStatus,
} from '../_shared/appleIap.ts';
import { isRateLimited } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });

type RenewalInfo = {
    originalTransactionId?: string;
    autoRenewStatus?: number; // 0=off, 1=on
    productId?: string;
};

type TransactionInfo = {
    originalTransactionId: string;
    transactionId?: string;
    productId?: string;
    expiresDate?: number;
    purchaseDate?: number;
};

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { error: 'misconfigured' });

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) return json(401, { error: 'unauthorized' });

    let payload: { originalTransactionId?: string; productId?: string };
    try {
        payload = await req.json();
    } catch (_) {
        return json(400, { error: 'invalid_json' });
    }
    const originalTransactionId = String(payload.originalTransactionId ?? '').trim();
    if (!originalTransactionId) return json(400, { error: 'missing_original_transaction_id' });

    const userClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: 'unauthorized', detail: userErr?.message });
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // レート制限: 60 秒で 10 回（StoreKit リスナーの暴走対策）
    if (await isRateLimited(admin, `verify-iap:${userId}`, 60, 10)) {
        return json(429, { error: 'too_many_requests' });
    }

    let statusResp;
    try {
        statusResp = await fetchSubscriptionStatuses(originalTransactionId);
    } catch (e) {
        return json(502, { error: 'apple_api_failed', detail: (e as Error).message });
    }

    const lastTx = statusResp.data?.[0]?.lastTransactions?.[0];
    if (!lastTx) return json(404, { error: 'no_transaction' });

    const tx = decodeJws<TransactionInfo>(lastTx.signedTransactionInfo);
    const renewal = decodeJws<RenewalInfo>(lastTx.signedRenewalInfo);
    const status = mapAppleStatus(lastTx.status);
    const expiresAt = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null;
    const productId = tx.productId || renewal.productId || payload.productId || 'unknown';

    const { error: upsertErr } = await admin
        .from('subscriptions')
        .upsert(
            {
                user_id: userId,
                store: 'apple',
                product_id: productId,
                original_transaction_id: tx.originalTransactionId,
                latest_transaction_id: tx.transactionId ?? null,
                status,
                auto_renew: renewal.autoRenewStatus === 1,
                expires_at: expiresAt,
                last_verified_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
        );
    if (upsertErr) {
        return json(500, { error: 'upsert_failed', detail: upsertErr.message });
    }

    return json(200, {
        ok: true,
        status,
        expiresAt,
        productId,
        autoRenew: renewal.autoRenewStatus === 1,
    });
});
