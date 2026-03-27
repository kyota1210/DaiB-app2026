import { apiFetch } from './client';

export const addReaction = (token, recordId, emoji) =>
    apiFetch(token, '/reactions', {
        method: 'POST',
        body: { record_id: recordId, emoji },
    });

export const getReactionSummary = (token, recordId) =>
    apiFetch(token, `/reactions/${recordId}`, { method: 'GET' });

export const getReactionDetails = (token, recordId) =>
    apiFetch(token, `/reactions/${recordId}/details`, { method: 'GET' });
