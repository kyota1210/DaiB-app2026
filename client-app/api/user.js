import { API_BASE_URL } from '../config';

/**
 * プロフィールを更新（ユーザー名、自己紹介、アバター画像）
 * @param {string} token - 認証トークン
 * @param {string} userName - 更新するユーザー名
 * @param {string} bio - 更新する自己紹介（100文字まで）
 * @param {object} avatarFile - アップロードする画像ファイル（uri, name, type）
 */
export const updateProfile = async (token, userName, bio, avatarFile) => {
    const formData = new FormData();
    
    // ユーザー名を追加
    if (userName !== undefined) {
        formData.append('user_name', userName);
    }
    
    // 自己紹介を追加
    if (bio !== undefined) {
        formData.append('bio', bio);
    }
    
    // アバター画像を追加
    if (avatarFile) {
        const file = {
            uri: avatarFile.uri,
            type: avatarFile.type || 'image/jpeg',
            name: avatarFile.name || 'avatar.jpg',
        };
        formData.append('avatar', file);
    }
    
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            // 'Content-Type': 'multipart/form-data' は自動で設定される
        },
        body: formData,
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`サーバーエラー: 期待されるJSONレスポンスが返されませんでした。ステータス: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'プロフィール更新に失敗しました');
    }
    
    return data;
};

/**
 * ユーザー情報を取得（アバター画像含む）
 * @param {string} token - 認証トークン
 */
export const getUserProfile = async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`サーバーエラー: 期待されるJSONレスポンスが返されませんでした。ステータス: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
    
    return data;
};
