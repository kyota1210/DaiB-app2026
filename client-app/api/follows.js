import { apiFetch } from './client';

export const follow = async (token, followingId) => {
    return apiFetch(token, '/follows', {
        method: 'POST',
        body: { following_id: followingId },
    });
};

export const unfollow = async (token, followingId) => {
    return apiFetch(token, `/follows/${followingId}`, { method: 'DELETE' });
};

/** 相手からのフォロー（フレンド申請待ち）を拒否＝申請者→自分 のフォロー行を削除 */
export const rejectIncomingFollow = async (token, followerId) => {
    return apiFetch(token, `/follows/incoming/${followerId}`, { method: 'DELETE' });
};
