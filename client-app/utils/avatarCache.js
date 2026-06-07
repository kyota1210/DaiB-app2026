import { getImageUrl } from './imageHelper';

/** user_id → { avatar_url, avatar_updated_at, avatar_uri } */
const store = new Map();

export function getAvatarFromCache(userId) {
    if (!userId) return null;
    return store.get(userId) ?? null;
}

export function putAvatarInCache(userId, avatarUrl, updatedAt) {
    if (!userId || !avatarUrl) return null;
    const entry = {
        avatar_url: avatarUrl,
        avatar_updated_at: updatedAt ?? null,
        avatar_uri: getImageUrl(avatarUrl, updatedAt),
    };
    store.set(userId, entry);
    return entry;
}

export function seedAvatarCacheFromProfiles(profiles) {
    for (const profile of profiles || []) {
        if (profile?.id && profile?.avatar_url) {
            putAvatarInCache(profile.id, profile.avatar_url, profile.updated_at);
        }
    }
}

/** リアクション表示用: キャッシュ優先でアバター URI を解決 */
export function resolveReactionUserAvatar(userId, avatarUrl, updatedAt) {
    if (!userId) return null;
    const cached = getAvatarFromCache(userId);
    if (
        cached
        && avatarUrl
        && cached.avatar_url === avatarUrl
        && cached.avatar_updated_at === updatedAt
    ) {
        return cached;
    }
    if (avatarUrl) {
        return putAvatarInCache(userId, avatarUrl, updatedAt);
    }
    return cached;
}
