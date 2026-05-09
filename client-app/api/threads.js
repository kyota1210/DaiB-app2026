import { getTimeline as getTimelineDirect } from './supabaseData';

export const getTimeline = async (_token, clientTimezone) => getTimelineDirect(clientTimezone);
