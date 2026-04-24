import {
  addReaction as addReactionDirect,
  getReactionSummary as getReactionSummaryDirect,
  getReactionDetails as getReactionDetailsDirect,
} from './supabaseData';

export const addReaction = (_token, recordId, emoji) => addReactionDirect(recordId, emoji);
export const getReactionSummary = (_token, recordId) => getReactionSummaryDirect(recordId);
export const getReactionDetails = (_token, recordId) => getReactionDetailsDirect(recordId);
