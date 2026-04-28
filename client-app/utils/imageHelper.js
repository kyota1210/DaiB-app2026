import { SERVER_URL, SUPABASE_URL, POST_IMAGES_BUCKET, AVATARS_BUCKET } from '../config';
import { supabase } from './supabase';

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** postId は UUID または bigint 文字列 */
const isPostIdPathSegment = (s) => UUID_SEGMENT.test(s) || /^\d+$/.test(s);

/** アップロード時のファイル名: {timestamp}.{ext} */
const isPostImageFilename = (s) => /^\d+\.[a-z0-9]{2,5}$/i.test(s);

/**
 * DB の image_url をバケット内オブジェクトキーに揃える。
 * - 先頭スラッシュ、任意の「バケット名/」プレフィックスを除去
 * - 既にフル URL の場合は .../public/<bucket>/ 以降をキーとして取り出す
 */
const normalizePostImageObjectKey = (raw) => {
    let s = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();
    if (!s) return '';
    s = s.replace(/^\/+/, '');
    const bucketPrefix = `${POST_IMAGES_BUCKET}/`;
    if (s.startsWith(bucketPrefix)) {
        s = s.slice(bucketPrefix.length);
    }
    const marker = `/storage/v1/object/public/${POST_IMAGES_BUCKET}/`;
    const idx = s.indexOf(marker);
    if (idx !== -1) {
        s = s.slice(idx + marker.length);
    }
    s = s.split('?')[0].split('#')[0];
    return s;
};

const isPostImageStorageKey = (key) => {
    if (!key || key.includes('..')) return false;
    const parts = key.split('/').filter(Boolean);
    if (parts.length !== 3) return false;
    return (
        UUID_SEGMENT.test(parts[0]) &&
        isPostIdPathSegment(parts[1]) &&
        isPostImageFilename(parts[2])
    );
};

/** DB の avatar_url をバケット内キーに揃える（フル URL・avatars/ プレフィックス・古い形式を吸収） */
const normalizeAvatarObjectKey = (raw) => {
    let s = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();
    if (!s) return '';
    s = s.replace(/^\/+/, '');
    if (/^https?:\/\//i.test(s)) {
        try {
            const u = new URL(s);
            const prefix = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
            const idx = u.pathname.indexOf(prefix);
            if (idx !== -1) {
                s = decodeURIComponent(u.pathname.slice(idx + prefix.length));
            }
        } catch (_) {
            /* ignore */
        }
    } else {
        const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
        const midx = s.indexOf(marker);
        if (midx !== -1) {
            s = s.slice(midx + marker.length);
        }
    }
    const bucketPrefix = `${AVATARS_BUCKET}/`;
    if (s.startsWith(bucketPrefix)) {
        s = s.slice(bucketPrefix.length);
    }
    s = s.split('?')[0].split('#')[0];
    return s;
};

const isAvatarStorageKey = (key) => {
    if (!key || key.includes('..')) return false;
    const parts = key.split('/').filter(Boolean);
    if (parts.length !== 2) return false;
    if (!UUID_SEGMENT.test(parts[0])) return false;
    return /^avatar\.jpe?g$/i.test(parts[1]);
};

const buildAvatarsPublicUrl = (objectKey) => {
    const base = (SUPABASE_URL || '').replace(/\/$/, '');
    const encodedKey = objectKey
        .split('/')
        .filter(Boolean)
        .map((seg) => encodeURIComponent(seg))
        .join('/');
    if (base) {
        return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${encodedKey}`;
    }
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(objectKey);
    return data.publicUrl;
};

/** createClient と同じプロジェクト URL で公開オブジェクト URL を組み立てる */
const buildPostImagesPublicUrl = (objectKey) => {
    const base = (SUPABASE_URL || '').replace(/\/$/, '');
    const encodedKey = objectKey
        .split('/')
        .filter(Boolean)
        .map((seg) => encodeURIComponent(seg))
        .join('/');
    if (base) {
        return `${base}/storage/v1/object/public/${POST_IMAGES_BUCKET}/${encodedKey}`;
    }
    const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(objectKey);
    return data.publicUrl;
};

/**
 * 画像パスを受け取り、完全なURLを返します。
 * DBに保存された相対パスと、サーバーのベースURLを結合します。
 * 既に完全なURL（古いデータなど）の場合はそのまま返します。
 *
 * @param {string} path - DBから取得した画像のパス (例: "uploads/image.jpg")
 * @param {string|number} [avatarCacheBust] - プロフィール画像のみ。固定キー upsert 時のキャッシュ回避（例: profiles.updated_at）
 * @returns {string|null} - 完全なURL または null
 */
export const getImageUrl = (path, avatarCacheBust) => {
    if (path == null || path === '') return null;

    const str = typeof path === 'string' ? path.trim() : String(path).trim();

    const avatarKey = normalizeAvatarObjectKey(str);
    if (isAvatarStorageKey(avatarKey)) {
        let url = buildAvatarsPublicUrl(avatarKey);
        if (avatarCacheBust != null && String(avatarCacheBust).trim() !== '') {
            const v = encodeURIComponent(String(avatarCacheBust).trim());
            url += url.includes('?') ? `&v=${v}` : `?v=${v}`;
        }
        return url;
    }

    const postKey = normalizePostImageObjectKey(str);
    if (POST_IMAGES_BUCKET && isPostImageStorageKey(postKey)) {
        return buildPostImagesPublicUrl(postKey);
    }

    if (str.startsWith('http://') || str.startsWith('https://')) {
        return str;
    }

    if (str.startsWith(`${AVATARS_BUCKET}/`) && SUPABASE_URL) {
        return `${SUPABASE_URL}/storage/v1/object/public/${str}`;
    }
    if ((str.startsWith('posts/') || str.startsWith('records/')) && SUPABASE_URL) {
        return `${SUPABASE_URL}/storage/v1/object/public/${str}`;
    }

    const cleanPath = str.startsWith('/') ? str.substring(1) : str;

    if (!SERVER_URL) {
        return null;
    }
    return `${SERVER_URL}/${cleanPath}`;
};
