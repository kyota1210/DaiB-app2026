import { apiFetch } from './client';

export const fetchCategories = async (token) => {
    const data = await apiFetch(token, '/categories', { method: 'GET' });
    return data.categories;
};

export const createCategory = async (token, { name }) => {
    const data = await apiFetch(token, '/categories', {
        method: 'POST',
        body: { name },
    });
    return data.category;
};

export const updateCategory = async (token, id, { name }) => {
    const data = await apiFetch(token, `/categories/${id}`, {
        method: 'PUT',
        body: { name },
    });
    return data.category;
};

export const deleteCategory = async (token, id) => {
    return apiFetch(token, `/categories/${id}`, { method: 'DELETE' });
};
