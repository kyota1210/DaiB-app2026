import { Linking } from 'react-native';
import { LEGAL_URLS } from '../config';

/**
 * 法務文書の公開ページを外部ブラウザで開く。
 * @param {'privacyPolicy' | 'terms' | 'specifiedCommercial'} key
 */
export const openLegalUrl = (key) => {
    const url = LEGAL_URLS[key];
    if (!url) return;
    Linking.openURL(url).catch(() => { /* noop */ });
};
