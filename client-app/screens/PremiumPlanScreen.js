import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const PremiumPlanScreen = ({ navigation }) => {
    const [isPremium, setIsPremium] = useState(false);
    const { theme } = useTheme();
    const { t } = useLanguage();

    const handleSubscribe = () => {
        Alert.alert(
            t('upgradeToPremium'),
            '月額980円でプレミアム機能をご利用いただけます。',
            [
                { text: t('cancel'), style: 'cancel' },
                { 
                    text: '購読する', 
                    onPress: () => {
                        // TODO: 購読処理を実装
                        Alert.alert(t('completed'), t('upgradedToPremium'));
                        setIsPremium(true);
                    }
                }
            ]
        );
    };

    const handleCancel = () => {
        Alert.alert(
            t('cancelPlan'),
            t('cancelPlanConfirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                { 
                    text: '解約する', 
                    style: 'destructive',
                    onPress: () => {
                        // TODO: 解約処理を実装
                        Alert.alert(t('completed'), t('planCanceled'));
                        setIsPremium(false);
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            {/* トップナビゲーションバー */}
            <View style={[styles.topNavBar, {
                backgroundColor: '#000000',
                borderBottomColor: theme.colors.border
            }]}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('premiumPlan')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={[styles.scrollView, { backgroundColor: '#000000' }]}>
                {/* プランステータス */}
                <View style={[styles.statusCard, { backgroundColor: '#000000' }]}>
                    <View style={styles.statusIconContainer}>
                        <Ionicons 
                            name={isPremium ? "diamond" : "diamond-outline"} 
                            size={48} 
                            color={isPremium ? "#FFD700" : theme.colors.inactive} 
                        />
                    </View>
                    <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                        {isPremium ? t('premiumActive') : t('freePlan')}
                    </Text>
                    <Text style={[styles.statusSubtitle, { color: theme.colors.secondaryText }]}>
                        {isPremium ? `${t('nextRenewal')}: 2025/01/20` : t('freeForever')}
                    </Text>
                </View>

                {/* プレミアム機能 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('premiumFeatures')}</Text>
                    <View style={[styles.featureCard, { backgroundColor: '#000000' }]}>
                        <FeatureItem 
                            icon="cloud-upload" 
                            title={t('unlimitedStorage')} 
                            description={t('allPhotosCloud')}
                            theme={theme}
                        />
                        <FeatureItem 
                            icon="sparkles" 
                            title={t('advancedFilters')} 
                            description={t('professionalTools')}
                            theme={theme}
                        />
                        <FeatureItem 
                            icon="stats-chart" 
                            title={t('detailedStats')} 
                            description={t('analyzeTrends')}
                            theme={theme}
                        />
                        <FeatureItem 
                            icon="notifications-off" 
                            title={t('noAds')} 
                            description={t('comfortableViewing')}
                            theme={theme}
                        />
                        <FeatureItem 
                            icon="people" 
                            title={t('prioritySupport')} 
                            description={t('rapidSupport')}
                            theme={theme}
                        />
                    </View>
                </View>

                {/* 価格 */}
                {!isPremium && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('pricingPlan')}</Text>
                        <View style={[styles.priceCard, { backgroundColor: '#000000' }]}>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceAmount, { color: theme.colors.primary }]}>¥980</Text>
                                <Text style={[styles.priceUnit, { color: theme.colors.secondaryText }]}>{t('perMonth')}</Text>
                            </View>
                            <Text style={[styles.priceNote, { color: theme.colors.inactive }]}>{t('cancelAnytime')}</Text>
                        </View>
                    </View>
                )}

                {/* ボタン */}
                <View style={styles.buttonSection}>
                    {!isPremium ? (
                        <TouchableOpacity 
                            style={[styles.subscribeButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSubscribe}
                        >
                            <Ionicons name="diamond" size={20} color="#fff" />
                            <Text style={styles.subscribeButtonText}>{t('upgradeToPremium')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.cancelButton, { 
                                backgroundColor: '#000000',
                                borderColor: '#FF3B30'
                            }]}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>{t('cancelPlan')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const FeatureItem = ({ icon, title, description, theme }) => (
    <View style={[styles.featureItem, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.featureIconContainer, { 
            backgroundColor: theme.isDark ? '#1a3a5c' : '#E8F4FF' 
        }]}>
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
    container: {
        flex: 1,
    },
    topNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    statusCard: {
        alignItems: 'center',
        paddingVertical: 40,
        marginTop: 20,
        marginHorizontal: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    statusIconContainer: {
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    statusSubtitle: {
        fontSize: 14,
    },
    section: {
        marginTop: 24,
        marginHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    featureCard: {
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
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
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 13,
    },
    priceCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    priceAmount: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    priceUnit: {
        fontSize: 20,
        marginLeft: 4,
    },
    priceNote: {
        fontSize: 14,
    },
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
        shadowColor: "#000",
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
});

export default PremiumPlanScreen;
