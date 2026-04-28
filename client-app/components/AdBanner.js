import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';

// react-native-google-mobile-ads は Expo Go では import できない。
// require で守ってあげて、解決できない環境ではバナーを描画しない。
let BannerAd = null;
let BannerAdSize = null;
let getAdRequestConfig = () => ({});
let getBannerUnitId = () => '';

try {
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    const helpers = require('../utils/ads');
    getAdRequestConfig = helpers.getAdRequestConfig;
    getBannerUnitId = helpers.getBannerUnitId;
} catch (_) {
    // Expo Go や Web では noop
}

/**
 * 共通バナー広告。
 * プレミアム時は何も描画しない。
 */
const AdBanner = ({ size }) => {
    const { isPremium } = useSubscription();
    if (isPremium) return null;
    if (!BannerAd || !BannerAdSize) return null;
    if (Platform.OS === 'web') return null;

    const adSize = size || BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
    return (
        <View style={styles.container}>
            <BannerAd
                unitId={getBannerUnitId()}
                size={adSize}
                requestOptions={getAdRequestConfig()}
                onAdFailedToLoad={(err) => {
                    console.warn('banner ad failed', err?.message);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
});

export default AdBanner;
