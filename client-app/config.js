const trimEndSlash = (v) => (typeof v === 'string' ? v.replace(/\/+$/, '') : '');

export const SERVER_URL = trimEndSlash(process.env.EXPO_PUBLIC_SERVER_URL || '');
export const SUPABASE_URL = trimEndSlash(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
export const POST_IMAGES_BUCKET = process.env.EXPO_PUBLIC_POST_IMAGES_BUCKET || 'posts';
export const AVATARS_BUCKET = process.env.EXPO_PUBLIC_AVATARS_BUCKET || 'avatars';
