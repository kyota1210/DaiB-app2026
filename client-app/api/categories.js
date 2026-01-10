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
export const createCategory = async (token, { name, icon, color }) => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, icon, color }),
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
export const updateCategory = async (token, id, { name, icon, color }) => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, icon, color }),
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

/**
 * カテゴリー画像をアップロード
 */
export const uploadCategoryImage = async (token, categoryId, imageUri) => {
    const formData = new FormData();
    
    // URIからファイル名と拡張子を取得
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // React Nativeでは、このオブジェクト構造が必要
    formData.append('image', {
        uri: imageUri,
        name: filename,
        type: type,
    });

    console.log('画像アップロード開始:', { categoryId, filename, type });

    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/image`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Content-Typeは指定しない（自動設定される）
        },
        body: formData,
    });

    console.log('レスポンスステータス:', response.status);

    if (!response.ok) {
        let errorMessage = 'カテゴリー画像のアップロードに失敗しました。';
        try {
            const errorData = await response.json();
            console.error('エラーレスポンス:', errorData);
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // JSONパースに失敗した場合はテキストを取得
            const errorText = await response.text();
            console.error('サーバーエラー(テキスト):', errorText);
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('アップロード成功:', data);
    return data.category;
};

/**
 * カテゴリー画像を削除
 */
export const deleteCategoryImage = async (token, categoryId) => {
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/image`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'カテゴリー画像の削除に失敗しました。');
    }

    const data = await response.json();
    return data.category;
};