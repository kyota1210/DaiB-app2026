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
