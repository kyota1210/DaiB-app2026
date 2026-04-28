// Supabase Edge Function: submit-contact
//
// 問い合わせフォームから受け取った内容を contacts テーブルに保存し、
// 任意で運営宛にメール送信する（SendGrid API key が設定されている場合のみ）。
//
// クライアントは Authorization: Bearer <user JWT> 付きで POST する。
// 認証必須なのは、なりすまし投稿・スパム抑制・user_id 紐付けのため。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { isRateLimited } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// 任意: 設定されている場合のみ運用宛にメール通知
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const CONTACT_TO_EMAIL = Deno.env.get('CONTACT_TO_EMAIL') ?? '';
const CONTACT_FROM_EMAIL = Deno.env.get('CONTACT_FROM_EMAIL') ?? '';

const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });

// メアド形式の最低限のチェック（厳密チェックは Auth 側で済んでいる前提）
const looksLikeEmail = (s: string) => /.+@.+\..+/.test(s);

const sanitize = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);

const sendMailViaSendGrid = async (params: {
    to: string;
    from: string;
    subject: string;
    text: string;
}) => {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            personalizations: [{ to: [{ email: params.to }] }],
            from: { email: params.from },
            subject: params.subject,
            content: [{ type: 'text/plain', value: params.text }],
        }),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`sendgrid_${res.status}: ${body.slice(0, 200)}`);
    }
};

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return json(405, { error: 'method_not_allowed' });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return json(500, { error: 'misconfigured' });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
        return json(401, { error: 'unauthorized' });
    }

    let payload: Record<string, unknown>;
    try {
        payload = await req.json();
    } catch (_) {
        return json(400, { error: 'invalid_json' });
    }

    const name = sanitize(String(payload.name ?? ''), 100);
    const email = sanitize(String(payload.email ?? ''), 320);
    const subject = sanitize(String(payload.subject ?? ''), 200);
    const message = String(payload.message ?? '').trim().slice(0, 4000);

    if (!name || !email || !subject || !message) {
        return json(400, { error: 'missing_fields' });
    }
    if (!looksLikeEmail(email)) {
        return json(400, { error: 'invalid_email' });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
        return json(401, { error: 'unauthorized', detail: userErr?.message });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // レート制限: 5 分窓で 3 件まで（汎用 RPC ベース）
    if (await isRateLimited(admin, `submit-contact:${userId}`, 300, 3)) {
        return json(429, { error: 'too_many_requests' });
    }

    const { data: inserted, error: insErr } = await admin
        .from('contacts')
        .insert({
            user_id: userId,
            name,
            email,
            subject,
            message,
        })
        .select('id')
        .single();
    if (insErr) {
        return json(500, { error: 'insert_failed', detail: insErr.message });
    }

    // 任意: 運用宛メール送信（失敗してもクライアントには成功扱い）
    if (SENDGRID_API_KEY && CONTACT_TO_EMAIL && CONTACT_FROM_EMAIL) {
        try {
            await sendMailViaSendGrid({
                to: CONTACT_TO_EMAIL,
                from: CONTACT_FROM_EMAIL,
                subject: `[DaiB お問い合わせ] ${subject}`,
                text: [
                    `From: ${name} <${email}>`,
                    `User ID: ${userId}`,
                    `Contact ID: ${inserted?.id ?? 'unknown'}`,
                    '',
                    message,
                ].join('\n'),
            });
        } catch (e) {
            console.warn('contact mail failed', (e as Error).message);
        }
    }

    return json(200, { ok: true, id: inserted?.id ?? null });
});
