const trimEndSlash = (v) => (typeof v === 'string' ? v.replace(/\/+$/, '') : '');
const trim = (v) => (typeof v === 'string' ? v.trim() : '');

/** Plusプラン月額（税込・円）。App Store の価格設定および表示の基準値 */
export const PLUS_MONTHLY_PRICE_YEN = 250;

export const formatPlusMonthlyPriceJa = () => `¥${PLUS_MONTHLY_PRICE_YEN}`;

export const SERVER_URL = trimEndSlash(process.env.EXPO_PUBLIC_SERVER_URL || '');
export const SUPABASE_URL = trimEndSlash(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
export const POST_IMAGES_BUCKET = trim(process.env.EXPO_PUBLIC_POST_IMAGES_BUCKET) || 'posts';
export const AVATARS_BUCKET = trim(process.env.EXPO_PUBLIC_AVATARS_BUCKET) || 'avatars';

/**
 * Supabase Image Transformation（/storage/v1/render/image/...）を使うか。
 * Pro プラン等で有効化後に EXPO_PUBLIC_USE_IMAGE_TRANSFORM=true を設定する。
 * 未設定時は false（公開 object URL にフォールバックして表示を優先）。
 */
export const USE_SUPABASE_IMAGE_TRANSFORM =
    trim(process.env.EXPO_PUBLIC_USE_IMAGE_TRANSFORM).toLowerCase() === 'true';
