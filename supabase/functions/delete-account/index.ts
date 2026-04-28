// Supabase Edge Function: delete-account
//
// 認証済みユーザー本人のアカウントを削除する。
// - Apple App Store Review Guideline 5.1.1(v) を満たすため、アプリ内から退会を実行できるようにする。
// - クライアントは Authorization: Bearer <user JWT> 付きで POST する。
// - 関連する投稿・カテゴリ・フォロー・リアクション・通報・ブロック・サブスク行は ON DELETE CASCADE か論理削除で消える前提。
//   既存スキーマで CASCADE されないテーブルは、本 Function 内で明示的に削除する。
// - Storage 上のアバター・投稿画像は本 Function でユーザー配下のオブジェクトを一括削除する。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { isRateLimited } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const POST_IMAGES_BUCKET = 'posts';
const AVATARS_BUCKET = 'avatars';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const removeAllInBucketUnderPrefix = async (
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
) => {
  // list は再帰しないので、トップ + サブフォルダを 2 段で列挙する。
  const top = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (top.error) return;
  const files: string[] = [];
  for (const entry of top.data ?? []) {
    if (entry.id) {
      files.push(`${prefix}/${entry.name}`);
    } else {
      // フォルダ
      const sub = await admin.storage.from(bucket).list(`${prefix}/${entry.name}`, { limit: 1000 });
      if (!sub.error) {
        for (const sentry of sub.data ?? []) {
          if (sentry.id) {
            files.push(`${prefix}/${entry.name}/${sentry.name}`);
          }
        }
      }
    }
  }
  if (files.length > 0) {
    await admin.storage.from(bucket).remove(files);
  }
};

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return json(405, { error: 'method_not_allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { error: 'misconfigured', detail: 'service env missing' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json(401, { error: 'unauthorized' });
  }

  // ユーザー JWT で getUser() し、本人を特定する
  const userClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'unauthorized', detail: userErr?.message });
  }
  const userId = userData.user.id;

  // service role クライアント（RLS をバイパス）
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // レート制限: 1 時間に最大 3 回（誤操作 / 攻撃緩和）
  if (await isRateLimited(admin, `delete-account:${userId}`, 3600, 3)) {
    return json(429, { error: 'too_many_requests' });
  }

  try {
    // 1. ストレージ削除（avatars / posts のユーザー配下）
    await removeAllInBucketUnderPrefix(admin, AVATARS_BUCKET, userId);
    await removeAllInBucketUnderPrefix(admin, POST_IMAGES_BUCKET, userId);

    // 2. CASCADE されない可能性があるテーブルの先掃除（存在しないテーブルは握り潰す）
    const cleanups = [
      admin.from('reactions').delete().eq('user_id', userId),
      admin.from('reports').delete().eq('reporter_id', userId),
      admin.from('user_blocks').delete().eq('user_id', userId),
      admin.from('user_blocks').delete().eq('blocked_user_id', userId),
      admin.from('follows').delete().eq('follower_id', userId),
      admin.from('follows').delete().eq('following_id', userId),
      admin.from('category_entities').delete().eq('user_id', userId),
      admin.from('categories').delete().eq('user_id', userId),
      admin.from('posts').delete().eq('user_id', userId),
      admin.from('subscriptions').delete().eq('user_id', userId),
      admin.from('profiles').delete().eq('id', userId),
    ];
    for (const p of cleanups) {
      try {
        const r = await p;
        if (r.error && !/does not exist|relation/i.test(String(r.error.message))) {
          console.warn('cleanup warn', r.error.message);
        }
      } catch (e) {
        console.warn('cleanup exception', (e as Error).message);
      }
    }

    // 3. auth.users から本人を削除
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json(500, { error: 'delete_failed', detail: delErr.message });
    }

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: 'internal', detail: (e as Error).message });
  }
});
