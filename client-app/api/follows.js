import {
  follow as followDirect,
  unfollow as unfollowDirect,
  rejectIncomingFollow as rejectIncomingFollowDirect,
  approveFollow as approveFollowDirect,
  acceptInvite as acceptInviteDirect,
} from './supabaseData';

export const follow = async (_token, followingId) => followDirect(followingId);
export const acceptInvite = async (_token, inviterId) => acceptInviteDirect(inviterId);
export const unfollow = async (_token, followingId) => unfollowDirect(followingId);
export const rejectIncomingFollow = async (_token, followerId) => rejectIncomingFollowDirect(followerId);
export const approveFollow = async (_token, followerId) => approveFollowDirect(followerId);
