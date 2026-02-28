import { API_BASE_URL } from '../config';

/**
 * フォローする
 * @param {string} token - 認証トークン
 * @param {number} followingId - フォローするユーザーID
 */
export const follow = async (token, followingId) => {
    const response = await fetch(`${API_BASE_URL}/follows`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ following_id: followingId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'フォローに失敗しました');
    return data;
};

/**
 * フォロー解除
 * @param {string} token - 認証トークン
 * @param {number} followingId - フォロー解除するユーザーID
 */
export const unfollow = async (token, followingId) => {
    const response = await fetch(`${API_BASE_URL}/follows/${followingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'フォロー解除に失敗しました');
    return data;
};
