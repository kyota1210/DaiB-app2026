// 投稿完了時など低頻度のインタースティシャル広告呼び出しヘルパー。
//
// Expo Go ではネイティブ実装が無いため noop で動く。Dev Client / EAS Build で動作。

let InterstitialAd = null;
let AdEventType = null;
let getAdRequestConfig = () => ({});
let getInterstitialUnitId = () => '';

try {
    const ads = require('react-native-google-mobile-ads');
    InterstitialAd = ads.InterstitialAd;
    AdEventType = ads.AdEventType;
    const helpers = require('./ads');
    getAdRequestConfig = helpers.getAdRequestConfig;
    getInterstitialUnitId = helpers.getInterstitialUnitId;
} catch (_) {
    // noop
}

const MIN_INTERVAL_MS = 3 * 60 * 1000;
let lastShownAt = 0;
let interstitial = null;
let isLoading = false;

const isAvailable = () => InterstitialAd != null && AdEventType != null;

const ensureInstance = () => {
    if (!isAvailable()) return null;
    if (interstitial) return interstitial;
    interstitial = InterstitialAd.createForAdRequest(getInterstitialUnitId(), getAdRequestConfig());
    return interstitial;
};

const loadIfNeeded = () => {
    const ad = ensureInstance();
    if (!ad) return Promise.resolve(false);
    if (ad.loaded) return Promise.resolve(true);
    if (isLoading) return Promise.resolve(false);
    isLoading = true;
    return new Promise((resolve) => {
        const removeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
            isLoading = false;
            removeLoaded();
            removeError();
            resolve(true);
        });
        const removeError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
            console.warn('interstitial load error', err?.message);
            isLoading = false;
            removeLoaded();
            removeError();
            interstitial = null;
            resolve(false);
        });
        try {
            ad.load();
        } catch (e) {
            console.warn('interstitial load throw', e?.message);
            isLoading = false;
            removeLoaded();
            removeError();
            interstitial = null;
            resolve(false);
        }
    });
};

export const preloadInterstitial = () => {
    loadIfNeeded();
};

export const showInterstitialIfReady = async ({ isPremium } = {}) => {
    if (isPremium) return false;
    if (!isAvailable()) return false;
    const now = Date.now();
    if (now - lastShownAt < MIN_INTERVAL_MS) return false;

    const loaded = await loadIfNeeded();
    if (!loaded) return false;

    const ad = ensureInstance();
    if (!ad) return false;

    return new Promise((resolve) => {
        const removeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            removeClosed();
            interstitial = null;
            lastShownAt = Date.now();
            preloadInterstitial();
            resolve(true);
        });
        try {
            ad.show();
        } catch (e) {
            console.warn('interstitial show throw', e?.message);
            removeClosed();
            interstitial = null;
            resolve(false);
        }
    });
};
