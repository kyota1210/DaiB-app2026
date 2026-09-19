import { Linking, Platform } from 'react-native';
import { ANDROID_PACKAGE_NAME, IOS_APP_STORE_ID } from '../config';

/**
 * ストアのレビュー投稿ページを外部で開く。
 * iOS: App Store の「レビューを書く」ページ
 * Android: Google Play のアプリ詳細ページ
 */
export const openStoreReview = () => {
    const url =
        Platform.OS === 'ios'
            ? `https://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`
            : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}&showAllReviews=true`;

    Linking.openURL(url).catch(() => { /* noop */ });
};
