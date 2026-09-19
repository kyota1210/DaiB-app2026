import { useWindowDimensions } from 'react-native';

/** フィード／ギャラリー／詳細／カレンダー向け */
export const CONTENT_MAX_WIDTH_MEDIA = 720;

/** フォーム／設定画面向け */
export const CONTENT_MAX_WIDTH_FORM = 560;

/**
 * ウィンドウ幅を上限付きでクリップしたコンテンツ幅を返す。
 * スマホでは windowWidth のまま、iPad 等の大画面では maxWidth に収まる。
 */
export function useContentWidth(maxWidth = CONTENT_MAX_WIDTH_MEDIA) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth, maxWidth);
    return { windowWidth, windowHeight, contentWidth, maxWidth };
}
