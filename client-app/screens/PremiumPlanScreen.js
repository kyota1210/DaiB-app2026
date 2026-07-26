import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { FREE_LIMITS } from '../hooks/useFeatureGate';
import { formatPlusMonthlyPriceJa } from '../config';
import {
    purchasesConfigure,
    purchasesGetMonthlyPackage,
    purchasesPurchasePackage,
    purchasesRestorePurchases,
    purchasesGetProductInfoForDisplay,
    isPurchasesAvailable,
} from '../utils/purchases';

const PremiumPlanScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { isPremium, expiresAt, refresh, refreshWithRetry } = useSubscription();

    const [loading, setLoading] = useState(false);
    const [activating, setActivating] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [priceDisplay, setPriceDisplay] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await purchasesConfigure();
            const info = await purchasesGetProductInfoForDisplay();
            if (!cancelled && info?.priceString) {
                setPriceDisplay(info.priceString);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubscribe = useCallback(async () => {
        if (!isPurchasesAvailable()) {
            Alert.alert(t('error') || 'エラー', t('iapNotAvailable') || '課金は実機ビルドでのみ利用できます。');
            return;
        }
        try {
            setLoading(true);
            const pkg = await purchasesGetMonthlyPackage();
            if (!pkg) {
                Alert.alert(
                    t('error') || 'エラー',
                    t('subscribeFailed') || 'プラン情報を取得できませんでした。RevenueCat の Offering を確認してください。',
                );
                return;
            }
            try {
                await purchasesPurchasePackage(pkg);
            } catch (e) {
                if (e?.userCancelled === true || String(e?.code || '').includes('CANCEL')) {
                    return;
                }
                throw e;
            }

            // 購入成功 → Webhook が DB を更新するまで最大20秒ポーリング
            setLoading(false);
            setActivating(true);
            const activated = await refreshWithRetry(10, 2000);
            if (!activated) {
                // タイムアウト時も購入自体は完了しているので再読込を促す
                Alert.alert(
                    t('completed') || '完了',
                    t('upgradedToPremium') ||
                        'Plusプランにアップグレードしました。反映まで少し時間がかかる場合があります。',
                );
            }
        } catch (e) {
            Alert.alert(t('error') || 'エラー', e?.message || (t('subscribeFailed') || '購読処理に失敗しました'));
        } finally {
            setLoading(false);
            setActivating(false);
        }
    }, [t, refreshWithRetry]);

    const handleRestore = useCallback(async () => {
        if (!isPurchasesAvailable()) {
            Alert.alert(t('error') || 'エラー', t('iapNotAvailable') || '課金は実機ビルドでのみ利用できます。');
            return;
        }
        try {
            setRestoring(true);
            try {
                await purchasesRestorePurchases();
            } catch (e) {
                if (e?.userCancelled === true) return;
                throw e;
            }
            await refresh();
            Alert.alert(t('completed') || '完了', t('restoreSucceeded') || '購入履歴を復元しました。');
        } catch (e) {
            Alert.alert(t('error') || 'エラー', e?.message || (t('restoreFailed') || '復元に失敗しました'));
        } finally {
            setRestoring(false);
        }
    }, [refresh, t]);

    const handleManageSubscription = useCallback(() => {
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
        } catch {
            return '';
        }
    };

    const postsBenefitDescription = t('premiumBenefitPostsDesc').replace(
        '{{limit}}',
        String(FREE_LIMITS.monthlyPostCount),
    );

    const categoriesBenefitDescription = t('premiumBenefitCategoriesDesc').replace(
        '{{limit}}',
        String(FREE_LIMITS.maxCustomCategories),
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('subscriptionScreenTitle')} onBack={() => navigation.goBack()} />

            <ScrollView style={[styles.scrollView, { backgroundColor: theme.colors.background }]}>
                <View
                    style={[
                        styles.statusCard,
                        { backgroundColor: theme.colors.background },
                        !isPremium && styles.statusCardNoIcon,
                    ]}
                >
                    {isPremium ? (
                        <View style={styles.statusIconContainer}>
                            <Ionicons name="diamond" size={48} color="#FFD700" />
                        </View>
                    ) : null}
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
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('subscriptionBenefitsTitle')}</Text>
                    <View style={[styles.featureCard, { backgroundColor: theme.colors.background }]}>
                        <FeatureItem
                            icon="folder-open-outline"
                            title={t('premiumBenefitCategoriesTitle')}
                            description={categoriesBenefitDescription}
                            theme={theme}
                        />
                        <FeatureItem
                            icon="infinite"
                            title={t('premiumBenefitPostsTitle')}
                            description={postsBenefitDescription}
                            theme={theme}
                        />
                        <FeatureItem
                            icon="time-outline"
                            title={t('premiumBenefitMemoryTitle')}
                            description={t('premiumBenefitMemoryDesc')}
                            theme={theme}
                            isLast
                        />
                    </View>
                </View>

                {!isPremium && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('pricingPlan')}</Text>
                        <View style={[styles.priceCard, { backgroundColor: theme.colors.background }]}>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceAmount, { color: theme.colors.primary }]}>
                                    {priceDisplay || formatPlusMonthlyPriceJa()}
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
                            style={[styles.subscribeButton, { backgroundColor: theme.colors.primary, opacity: (loading || activating) ? 0.6 : 1 }]}
                            onPress={handleSubscribe}
                            disabled={loading || activating}
                        >
                            {loading || activating ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator color="#fff" />
                                    {activating && (
                                        <Text style={styles.activatingText}>
                                            {t('activating') || 'アクティベーション中...'}
                                        </Text>
                                    )}
                                </View>
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

const FeatureItem = ({ icon, title, description, theme, isLast }) => (
    <View style={[styles.featureItem, { borderBottomColor: theme.colors.border, borderBottomWidth: isLast ? 0 : 1 }]}>
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
    statusCardNoIcon: { paddingTop: 48 },
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
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    activatingText: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '600',
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
