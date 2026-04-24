import {
  updateProfile as updateProfileDirect,
  getUserProfile as getUserProfileDirect,
  getFollowing as getFollowingDirect,
  getFollowers as getFollowersDirect,
  getFriends as getFriendsDirect,
  getOtherUserProfile as getOtherUserProfileDirect,
  updateDisplaySettings as updateDisplaySettingsDirect,
  getOtherUserRecords as getOtherUserRecordsDirect,
} from './supabaseData';

export const updateProfile = async (_token, userName, bio, avatarFile) =>
  updateProfileDirect({ userName, bio, avatarFile });

export const getUserProfile = async (_token) => getUserProfileDirect();
export const getFollowing = async (_token) => getFollowingDirect();
export const getFollowers = async (_token) => getFollowersDirect();
export const getFriends = async (_token) => getFriendsDirect();
export const getOtherUserProfile = async (_token, userId) => getOtherUserProfileDirect(userId);
export const updateDisplaySettings = async (_token, settings) => updateDisplaySettingsDirect(settings);
export const getOtherUserRecords = async (_token, userId) => getOtherUserRecordsDirect(userId);
