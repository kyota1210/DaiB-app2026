import { API_BASE_URL } from '../config';

/**
 * カテゴリー一覧を取得
 */
export const fetchCategories = async (token) => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'カテゴリーの取得に失敗しました。');
    }

    const data = await response.json();
    return data.categories;
};

/**
 * カテゴリーを作成
 */
export const createCategory = async (token, { name }) => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'カテゴリーの作成に失敗しました。');
    }

    const data = await response.json();
    return data.category;
};

/**
 * カテゴリーを更新
 */
export const updateCategory = async (token, id, { name }) => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'カテゴリーの更新に失敗しました。');
    }

    const data = await response.json();
    return data.category;
};

/**
 * カテゴリーを削除
 */
export const deleteCategory = async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'カテゴリーの削除に失敗しました。');
    }

    const data = await response.json();
    return data;
};
