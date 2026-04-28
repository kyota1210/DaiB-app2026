// Sentry とアナリティクスの初期化と、ATT 拒否時のオプトアウトを集約。
// Expo Go ではネイティブ機能が無いので noop で動く。

import { Platform } from 'react-native';

let Sentry = null;
try {
    Sentry = require('@sentry/react-native');
} catch (_) { /* Expo Go */ }

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

let initialized = false;
let analyticsEnabled = false;

export const initObservability = ({ trackingAuthorized = false } = {}) => {
    if (initialized) return;
    initialized = true;

    analyticsEnabled = Boolean(trackingAuthorized);

    if (!Sentry || !SENTRY_DSN) return;
    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            environment: APP_ENV,
            // ATT 拒否時はトラッキング系の自動メタデータを送らない方針
            sendDefaultPii: trackingAuthorized,
            tracesSampleRate: APP_ENV === 'production' ? 0.1 : 1.0,
            enableAutoSessionTracking: true,
            // 100% パフォーマンスを取りたければ別途 ProfilesSampleRate も。
        });
    } catch (e) {
        console.warn('Sentry init failed', e?.message);
    }
};

export const setObservabilityUser = (user) => {
    if (!Sentry || !user) return;
    try {
        Sentry.setUser({
            id: user.id ?? user.uid ?? user.user_id ?? null,
            // メールアドレスや user_name は PII 扱いとして送らない
        });
    } catch (e) {
        console.warn('Sentry setUser failed', e?.message);
    }
};

export const clearObservabilityUser = () => {
    if (!Sentry) return;
    try {
        Sentry.setUser(null);
    } catch (e) {
        console.warn('Sentry setUser(null) failed', e?.message);
    }
};

export const captureError = (error, extra) => {
    if (!Sentry) return;
    try {
        Sentry.captureException(error, { extra });
    } catch (e) {
        console.warn('Sentry capture failed', e?.message);
    }
};

export const trackEvent = (name, props) => {
    if (!analyticsEnabled) return; // ATT 拒否時はオプトアウト
    // PostHog / Amplitude を導入したらここで送信。
    // 現状はコンソールに出すだけのスタブ。
    if (__DEV__) {
        console.log('[analytics]', name, props || {}, `platform=${Platform.OS}`);
    }
};
