import { getTimeline as getTimelineDirect } from './supabaseData';

export const getTimeline = async (_token, _clientTimezone) => getTimelineDirect();
