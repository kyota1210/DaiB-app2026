import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
    iapInit,
    iapEnd,
    iapGetSubscriptions,
    iapRequestSubscription,
    iapGetAvailablePurchases,
    iapFinishTransaction,
    iapAddPurchaseListeners,
    extractOriginalTransactionId,
    isIapAvailable,
    PREMIUM_MONTHLY_PRODUCT_ID,
} from '../utils/iap';
import { verifyIapReceipt } from '../api/iap';

const PremiumPlanScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { isPremium, expiresAt, refresh } = useSubscription();

    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [productInfo, setProductInfo] = useState(null);

    useEffect(() => {
        let unsub = () => {};
        let cancelled = false;
        (async () => {
            const ok = await iapInit();
            if (!ok) return;
            const products = await iapGetSubscriptions([PREMIUM_MONTHLY_PRODUCT_ID]);
            if (!cancelled && products && products.length > 0) {
                setProductInfo(products[0]);
            }
            unsub = iapAddPurchaseListeners(
                async (purchase) => {
                    try {
                        const otid = extractOriginalTransactionId(purchase);
                        if (otid) {
                            await verifyIapReceipt({
                                originalTransactionId: otid,
                                productId: purchase?.productId,
                            });
                            await refresh();
                        }
                    } catch (e) {
                        console.warn('verify after purchase failed', e?.message);
                    } finally {
                        await iapFinishTransaction(purchase);
                    }
                },
                (err) => {
                    if (err?.code === 'E_USER_CANCELLED') return;
                    console.warn('iap purchase error', err?.message);
                },
            );
        })();
        return () => {
            cancelled = true;
            try { unsub(); } catch (_) { /* noop */ }
            iapEnd();
        };
    }, [refresh]);

    const handleSubscribe = useCallback(async () => {
        if (!isIapAvailable()) {
            Alert.alert(t('error') || 'エラー', t('iapNotAvailable') || '課金は実機ビルドでのみ利用できます。');
            return;
        }
        try {
            setLoading(true);
            await iapRequestSubscription(PREMIUM_MONTHLY_PRODUCT_ID);
            // 購入結果は purchaseUpdatedListener で処理する
        } catch (e) {
            if (e?.code !== 'E_USER_CANCELLED') {
                Alert.alert(t('error') || 'エラー', e?.message || (t('subscribeFailed') || '購読処理に失敗しました'));
            }
        } finally {
            setLoading(false);
        }
    }, [t]);

    const handleRestore = useCallback(async () => {
        if (!isIapAvailable()) {
            Alert.alert(t('error') || 'エラー', t('iapNotAvailable') || '課金は実機ビルドでのみ利用できます。');
            return;
        }
        try {
            setRestoring(true);
            const purchases = await iapGetAvailablePurchases();
            const target = (purchases || []).find((p) => p?.productId === PREMIUM_MONTHLY_PRODUCT_ID);
            if (!target) {
                Alert.alert(t('completed') || '完了', t('restoreNotFound') || '購入履歴が見つかりませんでした。');
                return;
            }
            const otid = extractOriginalTransactionId(target);
            if (!otid) throw new Error('missing_original_transaction_id');
            await verifyIapReceipt({ originalTransactionId: otid, productId: target.productId });
            await iapFinishTransaction(target);
            await refresh();
            Alert.alert(t('completed') || '完了', t('restoreSucceeded') || '購入履歴を復元しました。');
        } catch (e) {
            Alert.alert(t('error') || 'エラー', e?.message || (t('restoreFailed') || '復元に失敗しました'));
        } finally {
            setRestoring(false);
        }
    }, [refresh, t]);

    const handleManageSubscription = useCallback(() => {
        // App Store のサブスク管理画面に遷移（解約はここから）
        const url = Platform.OS === 'ios'
            ? 'https://apps.apple.com/account/subscriptions'
            : 'https://play.google.com/store/account/subscriptions';
        Linking.openURL(url).catch(() => { /* noop */ });
    }, []);

    const formatDate = (iso) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        } catch (_) {
            return '';
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('premiumPlan')} onBack={() => navigation.goBack()} />

            <ScrollView style={[styles.scrollView, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.statusCard, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.statusIconContainer}>
                        <Ionicons
                            name={isPremium ? 'diamond' : 'diamond-outline'}
                            size={48}
                            color={isPremium ? '#FFD700' : theme.colors.inactive}
                        />
                    </View>
                    <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                        {isPremium ? t('premiumActive') : t('freePlan')}
                    </Text>
                    <Text style={[styles.statusSubtitle, { color: theme.colors.secondaryText }]}>
                        {isPremium && expiresAt
                            ? `${t('nextRenewal')}: ${formatDate(expiresAt)}`
                            : isPremium
                                ? t('premiumActive')
                                : t('freeForever')}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('premiumFeatures')}</Text>
                    <View style={[styles.featureCard, { backgroundColor: theme.colors.background }]}>
                        <FeatureItem icon="cloud-upload" title={t('unlimitedStorage')} description={t('allPhotosCloud')} theme={theme} />
                        <FeatureItem icon="sparkles" title={t('advancedFilters')} description={t('professionalTools')} theme={theme} />
                        <FeatureItem icon="stats-chart" title={t('detailedStats')} description={t('analyzeTrends')} theme={theme} />
                        <FeatureItem icon="notifications-off" title={t('noAds')} description={t('comfortableViewing')} theme={theme} />
                        <FeatureItem icon="people" title={t('prioritySupport')} description={t('rapidSupport')} theme={theme} />
                    </View>
                </View>

                {!isPremium && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('pricingPlan')}</Text>
                        <View style={[styles.priceCard, { backgroundColor: theme.colors.background }]}>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceAmount, { color: theme.colors.primary }]}>
                                    {productInfo?.localizedPrice || '¥980'}
                                </Text>
                                <Text style={[styles.priceUnit, { color: theme.colors.secondaryText }]}>{t('perMonth')}</Text>
                            </View>
                            <Text style={[styles.priceNote, { color: theme.colors.inactive }]}>{t('cancelAnytime')}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.buttonSection}>
                    {!isPremium ? (
                        <TouchableOpacity
                            style={[styles.subscribeButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.6 : 1 }]}
                            onPress={handleSubscribe}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="diamond" size={20} color="#fff" />
                                    <Text style={styles.subscribeButtonText}>{t('upgradeToPremium')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: theme.colors.background, borderColor: '#FF3B30' }]}
                            onPress={handleManageSubscription}
                        >
                            <Text style={styles.cancelButtonText}>{t('manageSubscription') || 'サブスクリプションを管理'}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.restoreButton, { borderColor: theme.colors.border, opacity: restoring ? 0.6 : 1 }]}
                        onPress={handleRestore}
                        disabled={restoring}
                    >
                        {restoring ? (
                            <ActivityIndicator color={theme.colors.primary} />
                        ) : (
                            <Text style={[styles.restoreButtonText, { color: theme.colors.primary }]}>
                                {t('restorePurchases') || '購入履歴を復元'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.disclaimerText, { color: theme.colors.inactive }]}>
                        {t('iapDisclaimer') ||
                            '自動更新サブスクリプションです。期間終了の24時間以上前にキャンセルしない限り、同額で自動更新されます。設定 → Apple ID → サブスクリプションからいつでもキャンセルできます。'}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const FeatureItem = ({ icon, title, description, theme }) => (
    <View style={[styles.featureItem, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.featureIconContainer, { backgroundColor: theme.isDark ? '#1a3a5c' : '#E8F4FF' }]}>
            <Ionicons name={icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.featureDescription, { color: theme.colors.secondaryText }]}>{description}</Text>
        </View>
        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    statusCard: {
        alignItems: 'center',
        paddingVertical: 40,
        marginTop: 20,
        marginHorizontal: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    statusIconContainer: { marginBottom: 16 },
    statusTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
    statusSubtitle: { fontSize: 14 },
    section: { marginTop: 24, marginHorizontal: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    featureCard: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    featureTextContainer: { flex: 1 },
    featureTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    featureDescription: { fontSize: 13 },
    priceCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
    priceAmount: { fontSize: 48, fontWeight: 'bold' },
    priceUnit: { fontSize: 20, marginLeft: 4 },
    priceNote: { fontSize: 14 },
    buttonSection: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 40,
    },
    subscribeButton: {
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    subscribeButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 8,
    },
    cancelButton: {
        borderRadius: 12,
        paddingVertical: 16,
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
        textAlign: 'center',
    },
    restoreButton: {
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 1,
        alignItems: 'center',
    },
    restoreButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    disclaimerText: {
        marginTop: 16,
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'left',
    },
});

export default PremiumPlanScreen;
