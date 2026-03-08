import { AuthContext } from '../context/AuthContext';
import { useContext, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { Alert } from 'react-native';

const parseJsonResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`サーバーがJSON以外を返しました（${response.status}）。APIのURLとサーバー起動を確認してください。`);
    }
    try {
        return JSON.parse(text);
    } catch {
        throw new Error('サーバーからのレスポンスの解析に失敗しました。');
    }
};

/**
 * スタンドアロンAPI呼び出し（フック外から使用可能）
 * @param {string} token - 認証トークン
 * @param {string} endpoint - APIエンドポイント（例: '/categories'）
 * @param {object} options - fetch オプション（method, body, headers など）
 */
export const apiFetch = async (token, endpoint, options = {}) => {
    const isFormData = options.body instanceof FormData;
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
    };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        body: (options.body && !isFormData) ? JSON.stringify(options.body) : options.body,
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
        const error = new Error(data.message || 'APIリクエストに失敗しました。');
        error.status = response.status;
        throw error;
    }

    return data;
};

/**
 * React フック版APIクライアント（AuthContext 連携・401自動ログアウト）
 */
export const useApiClient = () => {
    const { userToken, authContext } = useContext(AuthContext);

    const apiFetchHook = useCallback(async (endpoint, options = {}) => {
        const isFormData = options.body instanceof FormData;
        const headers = { ...options.headers };

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        if (userToken) {
            headers['Authorization'] = `Bearer ${userToken}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            body: (options.body && !isFormData) ? JSON.stringify(options.body) : options.body,
        });

        const data = await parseJsonResponse(response);

        if (!response.ok) {
            if (response.status === 401) {
                Alert.alert(
                    "認証エラー",
                    "セッションの有効期限が切れました。再度ログインしてください。",
                    [{ text: "OK", onPress: () => authContext.signOut() }]
                );
                throw new Error('Unauthorized');
            }
            throw new Error(data.message || 'APIリクエストに失敗しました。');
        }

        return data;
    }, [userToken, authContext]);

    return { apiFetch: apiFetchHook };
};
