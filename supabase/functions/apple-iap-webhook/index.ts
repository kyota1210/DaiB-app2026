// Supabase Edge Function: apple-iap-webhook
//
// Apple App Store Server Notifications V2 を受け取り、subscriptions テーブルを更新する。
//
// V2 では POST body は次の形:
//   { "signedPayload": "<JWS>" }
// signedPayload を decode すると以下が含まれる:
//   { notificationType, subtype, data: { signedTransactionInfo, signedRenewalInfo, ... } }
//
// 注意:
//   - signedPayload の x5c 検証は本来必須（Apple ルート CA まで辿る）。本実装は MVP として
//     検証をスキップしているので、本番採用前に必ず jose 等で x5c 検証を追加すること。
//   - 本 Function は verify_jwt = false（supabase/config.toml で設定）。Apple は OAuth で
//     呼ばないので Supabase JWT は無い。ただし originalTransactionId が一致するレコードが既に
//     subscriptions に存在することを前提にする（初回購入時は verify-iap-receipt 経由で作成済み）。
//
// 設定:
//   App Store Connect → App → App Store Server Notifications → Production / Sandbox URL に
//   このエンドポイントを登録する。
//   URL 例: https://<project-ref>.supabase.co/functions/v1/apple-iap-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { decodeJws, mapAppleStatus } from '../_shared/appleIap.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });

type SignedPayload = {
    notificationType: string;
    subtype?: string;
    notificationUUID?: string;
    data?: {
        bundleId?: string;
        environment?: 'Sandbox' | 'Production';
        signedTransactionInfo?: string;
        signedRenewalInfo?: string;
        status?: number; // 1..5
    };
};

type TransactionInfo = {
    originalTransactionId: string;
    transactionId?: string;
    productId?: string;
    expiresDate?: number;
    revocationDate?: number;
    revocationReason?: number;
};

type RenewalInfo = {
    autoRenewStatus?: number;
    productId?: string;
    expirationIntent?: number;
};

const inferStatusFromNotification = (
    notificationType: string,
    subtype: string | undefined,
    fallbackStatus: number | undefined,
): string => {
    switch (notificationType) {
        case 'SUBSCRIBED':
        case 'DID_RENEW':
        case 'OFFER_REDEEMED':
        case 'DID_CHANGE_RENEWAL_PREF':
        case 'DID_CHANGE_RENEWAL_STATUS':
        case 'PRICE_INCREASE':
            return 'active';
        case 'EXPIRED':
            return 'expired';
        case 'GRACE_PERIOD_EXPIRED':
            return 'expired';
        case 'DID_FAIL_TO_RENEW':
            return subtype === 'GRACE_PERIOD' ? 'in_grace_period' : 'in_billing_retry';
        case 'REVOKE':
            return 'revoked';
        case 'REFUND':
            return 'refunded';
        case 'CONSUMPTION_REQUEST':
            return 'unknown';
        default:
            return fallbackStatus !== undefined ? mapAppleStatus(fallbackStatus) : 'unknown';
    }
};

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { error: 'misconfigured' });

    let body: { signedPayload?: string };
    try {
        body = await req.json();
    } catch (_) {
        return json(400, { error: 'invalid_json' });
    }
    if (!body.signedPayload) return json(400, { error: 'missing_signed_payload' });

    let payload: SignedPayload;
    try {
        payload = decodeJws<SignedPayload>(body.signedPayload);
    } catch (e) {
        return json(400, { error: 'invalid_payload', detail: (e as Error).message });
    }

    const data = payload.data;
    if (!data?.signedTransactionInfo) {
        // CONSUMPTION_REQUEST 等、対象外のものは 200 を返して握り潰す
        return json(200, { ok: true, ignored: payload.notificationType });
    }

    let tx: TransactionInfo;
    let renewal: RenewalInfo = {};
    try {
        tx = decodeJws<TransactionInfo>(data.signedTransactionInfo);
        if (data.signedRenewalInfo) {
            renewal = decodeJws<RenewalInfo>(data.signedRenewalInfo);
        }
    } catch (e) {
        return json(400, { error: 'invalid_inner_jws', detail: (e as Error).message });
    }

    const status = inferStatusFromNotification(payload.notificationType, payload.subtype, data.status);
    const expiresAt = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null;
    const productId = tx.productId || renewal.productId || 'unknown';

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // 既存レコード（originalTransactionId 一致）を user_id 付きで取得
    const { data: existing, error: findErr } = await admin
        .from('subscriptions')
        .select('user_id')
        .eq('original_transaction_id', tx.originalTransactionId)
        .maybeSingle();
    if (findErr) {
        console.warn('subscriptions find error', findErr.message);
    }

    if (!existing?.user_id) {
        // 初回購入の通知が verify-iap-receipt より先に届くケースを許容するため
        // 200 を返して終わる（user_id を解決できないので upsert できない）。
        // 後続の verify-iap-receipt で同期されるはず。
        console.warn('webhook: no matching subscription row yet', tx.originalTransactionId);
        return json(200, { ok: true, deferred: true });
    }

    const { error: updateErr } = await admin
        .from('subscriptions')
        .update({
            status,
            product_id: productId,
            latest_transaction_id: tx.transactionId ?? null,
            auto_renew: renewal.autoRenewStatus === 1,
            expires_at: expiresAt,
            last_verified_at: new Date().toISOString(),
        })
        .eq('original_transaction_id', tx.originalTransactionId);

    if (updateErr) {
        return json(500, { error: 'update_failed', detail: updateErr.message });
    }

    return json(200, { ok: true, notificationType: payload.notificationType, status });
});
