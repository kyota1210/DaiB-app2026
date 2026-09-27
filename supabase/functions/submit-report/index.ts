// Supabase Edge Function: submit-report
//
// 通報を受け付け、reports テーブルへ保存し、運営宛（support@daibapp.com）へメール通知する。
// クライアントは Authorization: Bearer <user JWT> 付きで POST する。
//
// Body:
//   { target_type: 'post'|'user'|'comment', target_id: string|number, reason: 'spam'|'abuse'|'illegal'|'other', detail?: string }
//
// レスポンス:
//   200 { ok: true, id }
//   400 / 401 / 409 / 429 / 500 { error: string, detail?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { isRateLimited } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
// 送信元はお問い合わせと同じ Resend 検証済みアドレスを流用
const REPORT_FROM_EMAIL =
  Deno.env.get('REPORT_FROM_EMAIL') ||
  Deno.env.get('CONTACT_FROM_EMAIL') ||
  '';
const REPORT_NOTIFY_EMAIL = 'support@daibapp.com';

const ALLOWED_TARGET_TYPES = new Set(['post', 'user', 'comment']);
const ALLOWED_REASONS = new Set(['spam', 'abuse', 'illegal', 'other']);

const REASON_LABEL: Record<string, string> = {
  spam: 'スパム・宣伝',
  abuse: '嫌がらせ・誹謗中傷',
  illegal: '違法・有害なコンテンツ',
  other: 'その他',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const sanitize = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);

const sendMailViaResend = async (params: {
  to: string;
  from: string;
  subject: string;
  text: string;
}) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`resend_${res.status}: ${body.slice(0, 200)}`);
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

  const targetType = String(payload.target_type ?? '').trim();
  const targetId = sanitize(String(payload.target_id ?? ''), 128);
  const reason = String(payload.reason ?? '').trim();
  const detailRaw = payload.detail == null ? '' : String(payload.detail);
  const detail = detailRaw.trim().slice(0, 1000) || null;

  if (!targetType || !targetId || !reason) {
    return json(400, { error: 'missing_fields' });
  }
  if (!ALLOWED_TARGET_TYPES.has(targetType)) {
    return json(400, { error: 'invalid_target_type' });
  }
  if (!ALLOWED_REASONS.has(reason)) {
    return json(400, { error: 'invalid_reason' });
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'unauthorized', detail: userErr?.message });
  }
  const userId = userData.user.id;

  // 自分自身のユーザー通報は拒否（投稿・コメントは対象外の可能性があるため user のみ）
  if (targetType === 'user' && targetId === userId) {
    return json(400, { error: 'cannot_report_self' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // レート制限: 10 分窓で 5 件まで
  if (await isRateLimited(admin, `submit-report:${userId}`, 600, 5)) {
    return json(429, { error: 'too_many_requests' });
  }

  const { data: inserted, error: insErr } = await admin
    .from('reports')
    .insert({
      reporter_id: userId,
      target_type: targetType,
      target_id: targetId,
      reason,
      detail,
      status: 'open',
    })
    .select('id')
    .single();

  if (insErr) {
    // UNIQUE (reporter_id, target_type, target_id) 違反
    if (insErr.code === '23505') {
      return json(409, { error: 'already_reported' });
    }
    return json(500, { error: 'insert_failed', detail: insErr.message });
  }

  if (RESEND_API_KEY && REPORT_FROM_EMAIL) {
    try {
      const reasonLabel = REASON_LABEL[reason] ?? reason;
      await sendMailViaResend({
        to: REPORT_NOTIFY_EMAIL,
        from: REPORT_FROM_EMAIL,
        subject: `[通報] ${targetType}:${targetId} / ${reasonLabel}`,
        text: [
          '新しい通報が届きました。原則 24 時間以内に初動対応してください。',
          '',
          `Report ID: ${inserted?.id ?? 'unknown'}`,
          `Reporter User ID: ${userId}`,
          `Target Type: ${targetType}`,
          `Target ID: ${targetId}`,
          `Reason: ${reason} (${reasonLabel})`,
          `Detail: ${detail ?? '(なし)'}`,
          `Status: open`,
          `Received At: ${new Date().toISOString()}`,
        ].join('\n'),
      });
    } catch (e) {
      console.warn('report mail failed', (e as Error).message);
    }
  } else {
    console.warn('report mail skipped: RESEND_API_KEY or FROM email not configured');
  }

  return json(200, { ok: true, id: inserted?.id ?? null });
});
