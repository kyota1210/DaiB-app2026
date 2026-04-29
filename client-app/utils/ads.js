// AdMob 初期化と ATT / UMP 同意フローを集約するラッパー。
//
// 使い方:
//   import { initAds, getAdRequestConfig, requestATTIfNeeded } from '../utils/ads';
//   await initAds();
//
// 注意:
//   - react-native-google-mobile-ads と expo-tracking-transparency は Expo Go では動かない。
//     Dev Client / EAS Build で動作する。Expo Go では全関数が noop / フォールバック値を返す。
//   - 開発時はテスト広告 ID を返すように、APP_ENV で分岐する。

import { Platform } from 'react-native';

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';

/** フィードで N 投稿ごとにバナー行を差し込む（末尾の直後は付けない） */
export const INLINE_BANNER_EVERY_N_POSTS = 4;

let TrackingTransparency = null;
let mobileAds = null;
let AdsConsent = null;
let AdsConsentStatus = null;
let MaxAdContentRating = null;

try {
    TrackingTransparency = require('expo-tracking-transparency');
} catch (_) { /* noop */ }
try {
    const ads = require('react-native-google-mobile-ads');
    mobileAds = ads.default;
    AdsConsent = ads.AdsConsent;
    AdsConsentStatus = ads.AdsConsentStatus;
    MaxAdContentRating = ads.MaxAdContentRating;
} catch (_) { /* noop */ }

let initialized = false;
let trackingAuthorized = false;

const isProductionLike = APP_ENV === 'production' || APP_ENV === 'preview';

const getEnv = (key, fallback) => {
    const v = process.env[key];
    return v && v.length > 0 ? v : fallback;
};

export const getBannerUnitId = () => {
    if (!isProductionLike) {
        return Platform.OS === 'ios' ? TEST_BANNER_IOS : TEST_BANNER_ANDROID;
    }
    if (Platform.OS === 'ios') {
        return getEnv('EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID', TEST_BANNER_IOS);
    }
    return getEnv('EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID', TEST_BANNER_ANDROID);
};

export const getInterstitialUnitId = () => {
    if (Platform.OS !== 'ios') return TEST_INTERSTITIAL_IOS;
    if (!isProductionLike) return TEST_INTERSTITIAL_IOS;
    return getEnv('EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID', TEST_INTERSTITIAL_IOS);
};

export const isTrackingAuthorized = () => trackingAuthorized;

export const requestATTIfNeeded = async () => {
    if (!TrackingTransparency || Platform.OS !== 'ios') {
        trackingAuthorized = Platform.OS !== 'ios'; // iOS 以外はトラッキング扱いにしない
        return trackingAuthorized;
    }
    try {
        const current = await TrackingTransparency.getTrackingPermissionsAsync();
        if (current.status === 'granted') {
            trackingAuthorized = true;
            return true;
        }
        if (current.status === 'denied' || current.status === 'restricted') {
            trackingAuthorized = false;
            return false;
        }
        const res = await TrackingTransparency.requestTrackingPermissionsAsync();
        trackingAuthorized = res.status === 'granted';
        return trackingAuthorized;
    } catch (e) {
        console.warn('ATT request failed', e?.message);
        trackingAuthorized = false;
        return false;
    }
};

const requestUMPConsentIfNeeded = async () => {
    if (!AdsConsent || !AdsConsentStatus) return;
    try {
        const info = await AdsConsent.requestInfoUpdate();
        if (
            info.isConsentFormAvailable &&
            (info.status === AdsConsentStatus.REQUIRED || info.status === AdsConsentStatus.UNKNOWN)
        ) {
            await AdsConsent.showForm();
        }
    } catch (e) {
        console.warn('UMP consent flow failed', e?.message);
    }
};

export const getAdRequestConfig = () => ({
    requestNonPersonalizedAdsOnly: !trackingAuthorized,
});

export const initAds = async () => {
    if (initialized) return;
    initialized = true;

    if (!mobileAds) return; // Expo Go

    try {
        await mobileAds().setRequestConfiguration({
            maxAdContentRating: MaxAdContentRating?.T,
            tagForChildDirectedTreatment: false,
            tagForUnderAgeOfConsent: false,
        });
    } catch (e) {
        console.warn('mobileAds setRequestConfiguration failed', e?.message);
    }

    await requestATTIfNeeded();
    await requestUMPConsentIfNeeded();

    try {
        await mobileAds().initialize();
    } catch (e) {
        console.warn('mobileAds initialize failed', e?.message);
    }
};
