const trimEndSlash = (v) => (typeof v === 'string' ? v.replace(/\/+$/, '') : '');
const trim = (v) => (typeof v === 'string' ? v.trim() : '');

/** Plusプラン月額（税込・円）。App Store の価格設定および表示の基準値 */
export const PLUS_MONTHLY_PRICE_YEN = 250;

export const formatPlusMonthlyPriceJa = () => `¥${PLUS_MONTHLY_PRICE_YEN}`;

/** 法務文書の公開 URL（GitHub Pages） */
export const LEGAL_URLS = {
    privacyPolicy: 'https://kyota1210.github.io/daib-legal/privacy-policy.html',
    terms: 'https://kyota1210.github.io/daib-legal/terms.html',
    specifiedCommercial: 'https://kyota1210.github.io/daib-legal/specified-commercial.html',
};

export const SUPABASE_URL = trimEndSlash(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
const _serverUrlEnv = trimEndSlash(process.env.EXPO_PUBLIC_SERVER_URL || '');
export const SERVER_URL = _serverUrlEnv || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/invite-redirect` : '');
export const POST_IMAGES_BUCKET = trim(process.env.EXPO_PUBLIC_POST_IMAGES_BUCKET) || 'posts';
export const AVATARS_BUCKET = trim(process.env.EXPO_PUBLIC_AVATARS_BUCKET) || 'avatars';

/**
 * 公開画像の配信元。Cloudflare の CDN（Worker / R2 カスタムドメイン）を指す。
 * パス構造は Supabase Storage と同じ /storage/v1/object/public/<bucket>/<key> を前提とする。
 * 未設定なら SUPABASE_URL に直接アクセスする。
 */
export const IMAGE_CDN_URL = trimEndSlash(process.env.EXPO_PUBLIC_IMAGE_CDN_URL || '');
