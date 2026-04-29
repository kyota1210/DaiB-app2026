// Supabase Edge Function: revenuecat-webhook
//
// RevenueCat からの Webhook を受け取り、public.subscriptions を更新する。
// 認証: RevenueCat ダッシュボードで設定した Authorization トークン（シークレット）と一致させる。
//
// app_user_id は Supabase auth.users.id（UUID）と一致させること（SDK で Purchases.logIn）。
//
// 設定:
//   RevenueCat Dashboard → Project → Integrations → Webhooks
//   URL: https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header: supabase secrets REVENUECAT_WEBHOOK_AUTHORIZATION と同じ値

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION') ?? '';

const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (s: string) => UUID_RE.test(String(s).trim());

type RcEvent = {
    type: string;
    id?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    product_id?: string;
    expiration_at_ms?: number | null;
    grace_period_expiration_at_ms?: number | null;
    purchased_at_ms?: number | null;
    event_timestamp_ms?: number | null;
    environment?: string;
    store?: string;
    transaction_id?: string;
    original_transaction_id?: string;
    cancel_reason?: string;
    expiration_reason?: string;
    transferred_from?: string[];
    transferred_to?: string[];
};

const normalizeAuth = (h: string) => h.replace(/^Bearer\s+/i, '').trim();

const verifyAuth = (req: Request): boolean => {
    if (!WEBHOOK_AUTH) return false;
    const got = normalizeAuth(req.headers.get('Authorization') ?? '');
    const expected = normalizeAuth(WEBHOOK_AUTH);
    return got.length > 0 && got === expected;
};

const mapStore = (store?: string): 'apple' | 'google' | null => {
    if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'apple';
    if (store === 'PLAY_STORE') return 'google';
    return null;
};

/** subscriptions.status 用。テーブル CHECK 制約に合わせる。 */
const mapEventToStatus = (event: RcEvent): string => {
    const t = event.type;
    const now = Date.now();
    const exp = event.expiration_at_ms ?? null;

    if (t === 'TEST') return '__skip__';
    if (t === 'SUBSCRIBER_ALIAS') return '__skip__';

    if (t === 'EXPIRATION') return 'expired';

    if (t === 'BILLING_ISSUE') {
        const g = event.grace_period_expiration_at_ms;
        if (g && now < g) return 'in_grace_period';
        return 'in_billing_retry';
    }

    if (t === 'CANCELLATION') {
        if (exp != null && exp > now) return 'active';
        return 'expired';
    }

    if (t === 'SUBSCRIPTION_PAUSED') {
        if (exp != null && exp > now) return 'active';
        return 'expired';
    }

    if (
        t === 'INITIAL_PURCHASE' ||
        t === 'RENEWAL' ||
        t === 'UNCANCELLATION' ||
        t === 'PRODUCT_CHANGE' ||
        t === 'SUBSCRIPTION_EXTENDED' ||
        t === 'REFUND_REVERSED' ||
        t === 'TEMPORARY_ENTITLEMENT_GRANT'
    ) {
        if (exp != null && exp <= now) return 'expired';
        return 'active';
    }

    if (t === 'NON_RENEWING_PURCHASE') {
        if (exp != null && exp <= now) return 'expired';
        return 'active';
    }

    if (t === 'TRANSFER') {
        if (exp == null) return 'active';
        if (exp <= now) return 'expired';
        return 'active';
    }

    if (t === 'INVOICE_ISSUANCE' || t === 'VIRTUAL_CURRENCY_TRANSACTION' || t === 'EXPERIMENT_ENROLLMENT') {
        return '__noop__';
    }

    return 'unknown';
};

const deriveAutoRenew = (event: RcEvent, status: string): boolean | null => {
    switch (event.type) {
        case 'CANCELLATION':
        case 'EXPIRATION':
            return false;
        case 'UNCANCELLATION':
            return true;
        case 'SUBSCRIPTION_PAUSED':
            return false;
        case 'NON_RENEWING_PURCHASE':
            return false;
        case 'BILLING_ISSUE':
            return true;
        default:
            break;
    }
    if (status === 'active' || status === 'in_grace_period' || status === 'in_billing_retry') return true;
    if (status === 'expired' || status === 'revoked' || status === 'refunded' || status === 'paused') return false;
    return null;
};

function resolveUserIds(event: RcEvent): string[] {
    const ids: string[] = [];
    const a = event.app_user_id?.trim();
    if (a && isUuid(a)) ids.push(a);
    if (event.type === 'TRANSFER') {
        for (const x of event.transferred_to ?? []) {
            if (isUuid(x)) ids.push(x);
        }
    }
    return [...new Set(ids)];
}

function resolveOriginalTx(event: RcEvent): string {
    const o = event.original_transaction_id?.trim();
    const t = event.transaction_id?.trim();
    return o || t || `rc:${event.id ?? 'unknown'}`;
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { error: 'misconfigured' });
    if (!verifyAuth(req)) return json(401, { error: 'unauthorized' });

    let body: { api_version?: string; event?: RcEvent };
    try {
        body = await req.json();
    } catch (_) {
        return json(400, { error: 'invalid_json' });
    }

    const event = body.event;
    if (!event || typeof event !== 'object') return json(400, { error: 'missing_event' });

    const status = mapEventToStatus(event);
    if (status === '__skip__') {
        return json(200, { ok: true, skipped: event.type });
    }
    if (status === '__noop__') {
        return json(200, { ok: true, ignored: event.type });
    }

    const store = mapStore(event.store);
    if (!store) {
        return json(200, { ok: true, skipped: 'unsupported_store', store: event.store });
    }

    const userIds = resolveUserIds(event);
    if (userIds.length === 0) {
        console.warn('revenuecat-webhook: no resolvable app_user_id', event.type, event.id);
        return json(200, { ok: true, deferred: true, reason: 'no_app_user_id' });
    }

    const productId = String(event.product_id ?? 'unknown').trim() || 'unknown';
    const origTx = resolveOriginalTx(event);
    const latestTx = event.transaction_id?.trim() ?? null;
    const expiresAt = event.expiration_at_ms != null
        ? new Date(event.expiration_at_ms).toISOString()
        : null;
    const autoRenew = deriveAutoRenew(event, status);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // TRANSFER: 移転元ユーザーの行を失効扱いにし、移転先へ upsert
    if (event.type === 'TRANSFER') {
        for (const fromId of (event.transferred_from ?? [])) {
            if (!isUuid(fromId)) continue;
            const { error } = await admin
                .from('subscriptions')
                .update({
                    status: 'expired',
                    auto_renew: false,
                    last_verified_at: new Date().toISOString(),
                })
                .eq('user_id', fromId);
            if (error) console.warn('transfer expire from failed', fromId, error.message);
        }
    }

    if (status === 'unknown' && event.type !== 'TRANSFER') {
        console.warn('revenuecat-webhook: unknown status mapping', event.type, event.id);
    }

    for (const userId of userIds) {
        const { error: upsertErr } = await admin.from('subscriptions').upsert(
            {
                user_id: userId,
                store,
                product_id: productId,
                original_transaction_id: origTx,
                latest_transaction_id: latestTx,
                status,
                auto_renew: autoRenew,
                expires_at: expiresAt,
                last_verified_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
        );
        if (upsertErr) {
            console.error('revenuecat-webhook upsert failed', userId, upsertErr.message);
            return json(500, { error: 'upsert_failed', detail: upsertErr.message });
        }
    }

    return json(200, { ok: true, type: event.type, status, users: userIds.length });
});
