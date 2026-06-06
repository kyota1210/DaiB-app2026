import { Platform } from 'react-native';

let initialized = false;

export const initObservability = () => {
    if (initialized) return;
    initialized = true;
};

export const setObservabilityUser = (_user) => {};

export const clearObservabilityUser = () => {};

export const captureError = (error, extra) => {
    if (__DEV__) {
        console.warn('[captureError]', error, extra);
    }
};

export const trackEvent = (name, props) => {
    if (__DEV__) {
        console.log('[analytics]', name, props || {}, `platform=${Platform.OS}`);
    }
};
