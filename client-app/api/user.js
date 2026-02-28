import { API_BASE_URL } from '../config';

/**
 * プロフィールを更新（ユーザー名、自己紹介、アバター画像、公開設定）
 * @param {string} token - 認証トークン
 * @param {string} userName - 更新するユーザー名
 * @param {string} bio - 更新する自己紹介（100文字まで）
 * @param {object} avatarFile - アップロードする画像ファイル（uri, name, type）
 * @param {string} [visibility] - 'public' | 'private'
 */
export const updateProfile = async (token, userName, bio, avatarFile, visibility) => {
    const formData = new FormData();
    
    // ユーザー名を追加
    if (userName !== undefined) {
        formData.append('user_name', userName);
    }
    
    // 自己紹介を追加
    if (bio !== undefined) {
        formData.append('bio', bio);
    }
    
    if (visibility !== undefined) {
        formData.append('visibility', visibility);
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
    const text = await response.text();
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`サーバーがJSON以外を返しました（${response.status}）。APIのURLとサーバー起動を確認してください。`);
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('サーバーからのレスポンスの解析に失敗しました。');
    }
    if (!response.ok) {
        throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
    return data;
};

/**
 * ユーザー検索（公開は部分一致、非公開は検索キーワード完全一致時のみ）
 * @param {string} token - 認証トークン
 * @param {string} query - 検索文字列
 */
export const searchUsers = async (token, query) => {
    const q = encodeURIComponent((query || '').trim());
    const response = await fetch(`${API_BASE_URL}/users/search?q=${q}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('検索に失敗しました');
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('検索に失敗しました');
    }
    if (!response.ok) throw new Error(data.message || '検索に失敗しました');
    return data;
};

/**
 * フォロー中一覧
 */
export const getFollowing = async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/me/following`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '一覧の取得に失敗しました');
    return data;
};

/**
 * フォロワー一覧
 */
export const getFollowers = async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/me/followers`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '一覧の取得に失敗しました');
    return data;
};

/**
 * 他ユーザーの公開プロフィール取得（ホーム画面用）
 * @param {string} token - 認証トークン
 * @param {number} userId - 対象ユーザーID
 */
export const getOtherUserProfile = async (token, userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`サーバーがJSON以外を返しました（${response.status}）。APIのURLとサーバー起動を確認してください。`);
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('サーバーからのレスポンスの解析に失敗しました。');
    }
    if (!response.ok) throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    return data;
};

/**
 * 表示設定を更新（一覧のデフォルト表示形式）
 * @param {string} token - 認証トークン
 * @param {string} defaultViewMode - 'grid' | 'list' | 'booklist' | 'tile'
 */
export const updateDisplaySettings = async (token, defaultViewMode) => {
    const response = await fetch(`${API_BASE_URL}/users/me/settings`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ default_view_mode: defaultViewMode }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '設定の更新に失敗しました');
    return data;
};

/**
 * 他ユーザーの投稿一覧取得（プロフィール画面用）
 * @param {string} token - 認証トークン
 * @param {number} userId - 対象ユーザーID
 */
export const getOtherUserRecords = async (token, userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/records`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('サーバーがJSON以外を返しました。');
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('レスポンスの解析に失敗しました。');
    }
    if (!response.ok) throw new Error(data.message || '投稿一覧の取得に失敗しました');
    return data;
};
