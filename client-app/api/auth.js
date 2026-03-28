import { API_BASE_URL } from '../config';

// パスワード再発行リクエスト（簡易版: レスポンスで reset_token が返る）
export const requestPasswordReset = async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`サーバーエラー: ステータス ${response.status}`);
    }
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'リクエストに失敗しました');
    }
    return data; // { message, reset_token?, expires_at? }
};

// パスワードリセット（トークンと新パスワードで更新）
export const resetPassword = async ({ token, new_password }) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), new_password }),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`サーバーエラー: ステータス ${response.status}`);
    }
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'パスワードの変更に失敗しました');
    }
    return data;
};

// ログイン中のユーザー情報を取得API
export const getUserInfo = async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
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

    return data; // 成功データ（user情報）を返す
};