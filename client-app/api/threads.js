import { apiFetch } from './client';

/**
 * @param {string} token
 * @param {string} [clientTimezone] IANA（例: Asia/Tokyo）。未指定時はサーバー側デフォルト
 */
export const getTimeline = async (token, clientTimezone) => {
    const headers = {};
    if (clientTimezone) {
        headers['X-Client-Timezone'] = clientTimezone;
    }
    return apiFetch(token, '/threads/timeline', { method: 'GET', headers });
};
