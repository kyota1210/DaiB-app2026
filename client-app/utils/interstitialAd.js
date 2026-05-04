// 投稿完了時など低頻度のインタースティシャル広告呼び出しヘルパー。
// 表示間隔（既定 3 分）はユーザー ID 単位で判定する（同一端末でアカウントを切り替えた場合など）。
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
/** 投稿インタースティシャル広告を最後に閉じた時刻（ユーザーごと・同一端末セッション内） */
const lastShownAtByUserId = new Map();
let interstitial = null;
/** 並行からの load を待つときに共有 */
let loadPromise = null;
/** discard 済み・ユーザー切り替え後の stale な LOADED を無視する */
let loadSessionId = 0;

const isAvailable = () => InterstitialAd != null && AdEventType != null;

const invalidateInterstitial = () => {
    loadSessionId += 1;
    interstitial = null;
};

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
    if (loadPromise) return loadPromise;

    const sessionStarted = loadSessionId;
    loadPromise = new Promise((resolve) => {
        const finish = (ok) => {
            if (sessionStarted !== loadSessionId) {
                loadPromise = null;
                resolve(false);
                return;
            }
            loadPromise = null;
            resolve(ok);
        };
        const removeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
            removeLoaded();
            removeError();
            finish(true);
        });
        const removeError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
            console.warn('interstitial load error', err?.message);
            removeLoaded();
            removeError();
            invalidateInterstitial();
            finish(false);
        });
        try {
            ad.load();
        } catch (e) {
            console.warn('interstitial load throw', e?.message);
            removeLoaded();
            removeError();
            invalidateInterstitial();
            finish(false);
        }
    });
    return loadPromise;
};

export const preloadInterstitial = () => {
    loadIfNeeded();
};

export const showInterstitialIfReady = async ({ isPremium, userId } = {}) => {
    if (isPremium) return false;
    if (!isAvailable()) return false;

    const userKey =
        userId != null && String(userId).trim() !== ''
            ? String(userId).trim()
            : '_anonymous';

    const now = Date.now();
    const lastShownAt = lastShownAtByUserId.get(userKey) ?? 0;
    if (now - lastShownAt < MIN_INTERVAL_MS) return false;

    // アカウント切り替え時など、前ユーザーのプリロード instance は show 直後に即 CLOSED になることがある。
    // 表示直前に世代を進めて読み直す。
    invalidateInterstitial();
    loadPromise = null;

    const loaded = await loadIfNeeded();
    if (!loaded) return false;

    const ad = ensureInstance();
    if (!ad) return false;

    return new Promise((resolve) => {
        const removeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            removeClosed();
            invalidateInterstitial();
            lastShownAtByUserId.set(userKey, Date.now());
            preloadInterstitial();
            resolve(true);
        });
        try {
            ad.show();
        } catch (e) {
            console.warn('interstitial show throw', e?.message);
            removeClosed();
            invalidateInterstitial();
            resolve(false);
        }
    });
};
