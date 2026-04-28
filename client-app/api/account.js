import { supabase } from '../utils/supabase';

/**
 * 認証済みユーザー本人のアカウントを削除する。
 * Edge Function `delete-account` を呼び出した後、ローカルセッションをサインアウトする。
 */
export const deleteOwnAccount = async () => {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) {
    const message =
      error?.context?.json?.detail ||
      error?.context?.json?.error ||
      error.message ||
      'アカウントの削除に失敗しました。';
    throw new Error(message);
  }
  // 念のため明示的にサインアウト（Function 側で auth.users 行が消えるとセッションは無効になる）
  try {
    await supabase.auth.signOut();
  } catch (_) {
    /* ignore */
  }
  return data ?? { ok: true };
};
