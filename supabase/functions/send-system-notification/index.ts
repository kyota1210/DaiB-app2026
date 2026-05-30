// Supabase Edge Function: send-system-notification
//
// 管理者ユーザーがアプリ内の管理画面から呼び出す。
// 呼び出し元は自分の JWT を Authorization ヘッダーに付与する。
// Edge Function 側でサービスロールを使い、呼び出し元の is_admin を検証する。
// is_admin=true でない場合は 403 を返す。
//
// リクエストボディ:
//   { "title": "string", "body": "string" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const BATCH_SIZE = 500;

const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return json(405, { error: 'method_not_allowed' });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return json(500, { error: 'misconfigured' });
    }

    // ユーザー JWT で本人確認
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
        return json(401, { error: 'unauthorized' });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
        return json(401, { error: 'unauthorized', detail: userErr?.message });
    }
    const callerId = userData.user.id;

    // service_role で is_admin を確認（RLS を経由しない確実な検証）
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileErr } = await admin
        .from('profiles')
        .select('is_admin')
        .eq('id', callerId)
        .maybeSingle();

    if (profileErr || !profile?.is_admin) {
        return json(403, { error: 'forbidden' });
    }

    // リクエストボディを取得
    let payload: Record<string, unknown>;
    try {
        payload = await req.json();
    } catch (_) {
        return json(400, { error: 'invalid_json' });
    }

    const title = String(payload.title ?? '').trim();
    const body  = String(payload.body ?? '').trim();
    if (!title || !body) {
        return json(400, { error: 'missing_fields', detail: 'title and body are required' });
    }

    // 全ユーザー ID を取得（ページネーション対応）
    let allUserIds: string[] = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) {
            return json(500, { error: 'list_users_failed', detail: error.message });
        }
        allUserIds = allUserIds.concat(data.users.map((u: { id: string }) => u.id));
        if (data.users.length < perPage) break;
        page++;
    }

    if (allUserIds.length === 0) {
        return json(200, { ok: true, inserted: 0, message: 'no_users' });
    }

    const now = new Date().toISOString();
    let insertedCount = 0;

    for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
        const batchIds = allUserIds.slice(i, i + BATCH_SIZE);
        const rows = batchIds.map((userId: string) => ({
            user_id: userId,
            type: 'system',
            title,
            body,
            is_read: false,
            created_at: now,
        }));

        const { error: insErr } = await admin
            .from('in_app_notifications')
            .insert(rows);

        if (insErr) {
            console.warn('batch insert failed:', insErr.message);
        } else {
            insertedCount += batchIds.length;
        }
    }

    // 配信履歴を記録
    await admin.from('notifications_log').insert({
        type: 'system',
        title,
        body,
        sent_by: `admin:${callerId}`,
    });

    return json(200, { ok: true, inserted: insertedCount });
});
