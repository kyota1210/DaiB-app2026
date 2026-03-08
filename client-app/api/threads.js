import { apiFetch } from './client';

export const getTimeline = async (token) => {
    return apiFetch(token, '/threads/timeline', { method: 'GET' });
};
