import { Linking } from 'react-native';

export const TERMS_URL = 'https://kyota1210.github.io/daib-legal/terms.html';
export const PRIVACY_URL = 'https://kyota1210.github.io/daib-legal/privacy-policy.html';
export const SPECIFIED_COMMERCIAL_URL = 'https://kyota1210.github.io/daib-legal/specified-commercial.html';

export const openLegalUrl = (url) => {
    Linking.openURL(url).catch(() => {});
};
