import { supabase } from '../utils/supabase';

const requireUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('認証が必要です。再ログインしてください。');
  return user.id;
};

/**
 * 通報を作成する（Edge Function `submit-report` 経由）。
 * レート制限・重複防止・運営メール通知はサーバー側で行う。
 * @param {Object} args
 * @param {'post'|'user'|'comment'} args.target_type
 * @param {string|number} args.target_id
 * @param {'spam'|'abuse'|'illegal'|'other'} args.reason
 * @param {string} [args.detail]
 */
export const createReport = async ({ target_type, target_id, reason, detail }) => {
  await requireUserId();
  const { data, error } = await supabase.functions.invoke('submit-report', {
    method: 'POST',
    body: {
      target_type,
      target_id: String(target_id),
      reason,
      detail: detail || null,
    },
  });
  if (error) {
    let code = error.message || 'report_failed';
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) code = body.error;
      } else if (ctx?.json?.error) {
        code = ctx.json.error;
      } else if (data?.error) {
        code = data.error;
      }
    } catch (_) {
      if (data?.error) code = data.error;
    }
    throw new Error(code);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data ?? { ok: true };
};

/** 指定ユーザーをブロックする */
export const blockUser = async (blockedUserId) => {
  const userId = await requireUserId();
  if (userId === blockedUserId) {
    throw new Error('自分自身をブロックすることはできません。');
  }
  const { error } = await supabase.from('user_blocks').upsert(
    { user_id: userId, blocked_user_id: blockedUserId },
    { onConflict: 'user_id,blocked_user_id' }
  );
  if (error) throw new Error(error.message);
  // ブロックと同時にフォロー関係も切る
  try {
    await supabase
      .from('follows')
      .update({ invalidation_flag: 1, deleted_at: new Date().toISOString() })
      .or(`and(follower_id.eq.${userId},following_id.eq.${blockedUserId}),and(follower_id.eq.${blockedUserId},following_id.eq.${userId})`);
  } catch (_) {
    /* ignore */
  }
  return { success: true };
};

/** 指定ユーザーのブロックを解除する */
export const unblockUser = async (blockedUserId) => {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_user_id', blockedUserId);
  if (error) throw new Error(error.message);
  return { success: true };
};

/** 自分がブロックしているか確認 */
export const isUserBlocked = async (targetUserId) => {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_user_id')
    .eq('user_id', userId)
    .eq('blocked_user_id', targetUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
};
