import { supabase } from '../utils/supabase';

/**
 * お問い合わせフォームの送信。
 * Edge Function `submit-contact` を呼び出し、`contacts` テーブルへ保存する。
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.subject
 * @param {string} params.message
 */
export const submitContact = async ({ name, email, subject, message }) => {
    if (!name || !email || !subject || !message) {
        throw new Error('missing_fields');
    }
    const { data, error } = await supabase.functions.invoke('submit-contact', {
        method: 'POST',
        body: { name, email, subject, message },
    });
    if (error) {
        const code =
            error?.context?.json?.error ||
            error.message ||
            'submit_failed';
        throw new Error(code);
    }
    return data ?? { ok: true };
};
