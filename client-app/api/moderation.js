import { supabase } from '../utils/supabase';

const requireUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('認証が必要です。再ログインしてください。');
  return user.id;
};

/**
 * 通報を作成する。
 * @param {Object} args
 * @param {'post'|'user'|'comment'} args.target_type
 * @param {string|number} args.target_id
 * @param {'spam'|'abuse'|'illegal'|'other'} args.reason
 * @param {string} [args.detail]
 */
export const createReport = async ({ target_type, target_id, reason, detail }) => {
  const reporterId = await requireUserId();
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type,
    target_id: String(target_id),
    reason,
    detail: detail || null,
  });
  if (error) throw new Error(error.message);
  return { success: true };
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
