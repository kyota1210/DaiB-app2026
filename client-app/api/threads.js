import { API_BASE_URL } from '../config';

/**
 * タイムライン取得（フォロー中ユーザーの直近7日間の記録）
 * @param {string} token - 認証トークン
 */
export const getTimeline = async (token) => {
    const response = await fetch(`${API_BASE_URL}/threads/timeline`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
            `サーバーがJSON以外を返しました（${response.status}）。APIのURL（${API_BASE_URL}）とサーバー起動を確認してください。`
        );
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('サーバーからのレスポンスの解析に失敗しました。');
    }
    if (!response.ok) throw new Error(data.message || 'タイムラインの取得に失敗しました');
    return data;
};
