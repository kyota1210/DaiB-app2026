import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';

const ProfileScreen = ({ navigation }) => {
    const { userInfo, authContext } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();

    const handleLogout = () => {
        Alert.alert(
            t('logout'),
            t('logoutConfirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await authContext.signOut();
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('settings')} onBack={() => navigation.goBack()} />

            <ScrollView style={[styles.scrollView, { backgroundColor: theme.colors.background }]}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('accountSettings')}</Text>
                    <View style={[styles.menuSection, { backgroundColor: theme.colors.background }]}>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('LoginInfo')}
                        >
                            <Ionicons name="key-outline" size={24} color={theme.colors.icon} />
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
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('daibSettings')}</Text>
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
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('appSettings')}</Text>
                    <View style={[styles.menuSection, { backgroundColor: theme.colors.background }]}>
                        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}>
                            <Ionicons name="notifications-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('notificationSettings')}</Text>
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
                            onPress={() => navigation.navigate('Terms')}
                        >
                            <Ionicons name="document-text-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('terms')}</Text>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.inactive} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={() => navigation.navigate('Privacy')}
                        >
                            <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.icon} />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('privacy')}</Text>
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

                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.6}>
                        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                        <Text style={styles.logoutText}>{t('logout')}</Text>
                    </TouchableOpacity>
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
    logoutSection: {
        marginTop: 40,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    logoutText: {
        fontSize: 14,
        color: '#FF3B30',
        marginLeft: 6,
    },
});

export default ProfileScreen;
