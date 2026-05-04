// アナリティクスの初期化と、ATT 拒否時のオプトアウトを集約。
// Expo Go ではネイティブ機能が無いので部分的に noop。

import { Platform } from 'react-native';

let initialized = false;
let analyticsEnabled = false;

export const initObservability = ({ trackingAuthorized = false } = {}) => {
    if (initialized) return;
    initialized = true;
    analyticsEnabled = Boolean(trackingAuthorized);
};

export const setObservabilityUser = (_user) => {};

export const clearObservabilityUser = () => {};

export const captureError = (error, extra) => {
    if (__DEV__) {
        console.warn('[captureError]', error, extra);
    }
};

export const trackEvent = (name, props) => {
    if (!analyticsEnabled) return;
    if (__DEV__) {
        console.log('[analytics]', name, props || {}, `platform=${Platform.OS}`);
    }
};
