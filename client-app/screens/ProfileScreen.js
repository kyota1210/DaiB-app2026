import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { getUnreadCount } from '../api/notifications';
import { openLegalUrl } from '../utils/openLegalUrl';

const ProfileScreen = ({ navigation }) => {
    const { userInfo } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isAdmin = userInfo?.is_admin === true;
    const [unreadCount, setUnreadCount] = useState(0);

    const loadUnreadCount = useCallback(async () => {
        const count = await getUnreadCount();
        setUnreadCount(count);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUnreadCount();
        }, [loadUnreadCount]),
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('settings')} onBack={() => navigation.goBack()} />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.scrollContent}
            >
                {isAdmin && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: '#E53935' }]}>{t('adminSection')}</Text>
                        <View style={[styles.menuSection, { backgroundColor: theme.colors.background }]}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => navigation.navigate('Admin')}
                            >
                                <Ionicons name="megaphone" size={24} color="#E53935" />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('adminTitle')}</Text>
                                <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('accountSettings')}</Text>
                    <View style={[styles.menuSection, { backgroundColor: theme.colors.background }]}>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('LoginInfo')}
                        >
                            <Ionicons name="person-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('loginInfo')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('PremiumPlan')}
                        >
                            <Ionicons name="diamond-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('premiumPlan')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('appSettings')}</Text>
                    <View style={[styles.menuSection, { backgroundColor: theme.colors.background }]}>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('CategoryManagement')}
                        >
                            <Ionicons name="list-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('categoryManagement')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('DisplaySettings')}
                        >
                            <Ionicons name="options-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('displaySettings')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('LanguageSetting')}
                        >
                            <Ionicons name="language-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('languageSettings')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('other')}</Text>
                    <View style={[styles.menuSection, { backgroundColor: theme.colors.background }]}>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('Notifications')}
                        >
                            <Ionicons name="megaphone-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('notifications')}</Text>
                            <View style={styles.menuRight}>
                                {unreadCount > 0 && (
                                    <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary ?? '#4E5F5C' }]}>
                                        <Text style={styles.unreadBadgeText}>
                                            {unreadCount > 99 ? '99+' : String(unreadCount)}
                                        </Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('Help')}
                        >
                            <Ionicons name="help-circle-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('help')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('About')}
                        >
                            <Ionicons name="information-circle-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('about')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => openLegalUrl('terms')}
                        >
                            <Ionicons name="document-text-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('terms')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => openLegalUrl('privacyPolicy')}
                        >
                            <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('privacy')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => openLegalUrl('specifiedCommercial')}
                        >
                            <Ionicons name="receipt-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('specifiedCommercialTransactions')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('Contact')}
                        >
                            <Ionicons name="mail-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('contact')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 56,
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    menuSection: {
        paddingVertical: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        marginLeft: 12,
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default ProfileScreen;
