import { getUserInfo as getUserInfoDirect, requestPasswordReset, resetPasswordWithSession } from './supabaseData';

export { requestPasswordReset };

// 互換のため token 引数を維持（Supabaseセッションを使用）
export const getUserInfo = async (_token) => getUserInfoDirect();

export const resetPassword = async ({ token, new_password }) => {
  if (token) {
    throw new Error('Supabase移行後はトークン入力方式ではなく、メールリンク遷移後にパスワードを更新してください。');
  }
  return resetPasswordWithSession({ new_password });
};
