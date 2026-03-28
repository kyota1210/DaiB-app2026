import { apiFetch } from './client';
import { API_BASE_URL } from '../config';

export const updateProfile = async (token, userName, bio, avatarFile) => {
    const formData = new FormData();

    if (userName !== undefined) formData.append('user_name', userName);
    if (bio !== undefined) formData.append('bio', bio);

    if (avatarFile) {
        formData.append('avatar', {
            uri: avatarFile.uri,
            type: avatarFile.type || 'image/jpeg',
            name: avatarFile.name || 'avatar.jpg',
        });
    }

    return apiFetch(token, '/users/profile', {
        method: 'PUT',
        body: formData,
    });
};

export const getUserProfile = async (token) => {
    return apiFetch(token, '/users/me', { method: 'GET' });
};

export const getFollowing = async (token) => {
    return apiFetch(token, '/users/me/following', { method: 'GET' });
};

export const getFollowers = async (token) => {
    return apiFetch(token, '/users/me/followers', { method: 'GET' });
};

export const getFriends = async (token) => {
    return apiFetch(token, '/users/me/friends', { method: 'GET' });
};

export const getOtherUserProfile = async (token, userId) => {
    return apiFetch(token, `/users/${userId}`, { method: 'GET' });
};

export const updateDisplaySettings = async (token, settings) => {
    const body = {};
    if (settings.default_view_mode !== undefined) body.default_view_mode = settings.default_view_mode;

    return apiFetch(token, '/users/me/settings', {
        method: 'PUT',
        body,
    });
};

export const getOtherUserRecords = async (token, userId) => {
    return apiFetch(token, `/users/${userId}/records`, { method: 'GET' });
};
