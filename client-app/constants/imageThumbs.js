import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 表示サイズ × 2（Retina）の要求ピクセル */
export const THUMB_GALLERY_GRID = 240;
export const THUMB_GALLERY_LIST = Math.min(800, Math.round(SCREEN_WIDTH * 2));
export const THUMB_GALLERY_BOOKLIST = 360;
export const THUMB_GALLERY_TILE = Math.round(
    ((SCREEN_WIDTH - 16 * 2 - 8 * 2) / 3) * 2
);
export const THUMB_LIFE_TIMELINE = 144;
export const THUMB_CALENDAR_DAY = 96;
export const THUMB_PROFILE_GRID = 240;
export const THUMB_THREAD_FEED = Math.round(SCREEN_WIDTH * 2);

export const THUMB_AVATAR_XS = 56;
export const THUMB_AVATAR_SM = 64;
export const THUMB_AVATAR_MD = 80;
export const THUMB_AVATAR_LG = 96;
export const THUMB_AVATAR_XL = 128;
export const THUMB_AVATAR_HEADER = 160;
export const THUMB_AVATAR_PROFILE = 256;
