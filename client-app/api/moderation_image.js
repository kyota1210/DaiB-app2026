import { supabase } from '../utils/supabase';

// 画像を Storage にアップロード後、bucket と path を渡して NSFW 判定する。
// 返り値: { ok, decision: 'allow' | 'review' | 'block', scores }
export const moderateImage = async ({ bucket, path }) => {
    if (!bucket || !path) {
        throw new Error('missing_fields');
    }
    const { data, error } = await supabase.functions.invoke('moderate-image', {
        method: 'POST',
        body: { bucket, path },
    });
    if (error) {
        // Vision 未設定 / 一時エラーの場合は失敗を握り潰し、allow 扱いにする。
        // ここで投稿を止めると、Vision API の障害でアプリが詰むため。
        console.warn('moderateImage error (treat as allow):', error?.message ?? error);
        return { ok: false, decision: 'allow', scores: null };
    }
    return data ?? { ok: true, decision: 'allow', scores: null };
};
