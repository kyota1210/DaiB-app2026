import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';
import OptionsList from '../components/OptionsList';

const ThemeSettingScreen = ({ navigation }) => {
    const { theme, changeTheme } = useTheme();
    const { t } = useLanguage();

    const themeOptions = [
        {
            id: 'light',
            title: t('lightMode'),
            description: t('lightModeDesc'),
            icon: 'sunny',
        },
        {
            id: 'dark',
            title: t('darkMode'),
            description: t('darkModeDesc'),
            icon: 'moon',
        },
        {
            id: 'system',
            title: t('systemSettings'),
            description: t('systemSettingsDesc'),
            icon: 'phone-portrait',
        },
    ];

    const handleThemeSelect = (themeId) => {
        changeTheme(themeId);
    };

    return (
        <SafeAreaView 
            style={[styles.container, { backgroundColor: theme.colors.background }]} 
            edges={['top']}
        >
            <ScreenHeader title={t('theme')} onBack={() => navigation.goBack()} />

            <ScrollView 
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 説明文 */}
                <View style={styles.descriptionSection}>
                    <Text style={[styles.descriptionText, { color: theme.colors.secondaryText }]}>
                        {t('selectTheme')}
                    </Text>
                </View>

                {/* テーマ選択リスト */}
                <OptionsList options={themeOptions} selectedId={theme.mode} onSelect={handleThemeSelect} />

                {/* プレビュー情報 */}
                <View style={styles.previewSection}>
                    <Text style={[styles.previewLabel, { color: theme.colors.secondaryText }]}>
                        {t('currentTheme')}
                    </Text>
                    <View style={[
                        styles.previewCard, 
                        { 
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border 
                        }
                    ]}>
                        <View style={styles.previewHeader}>
                            <Ionicons 
                                name={theme.isDark ? 'moon' : 'sunny'} 
                                size={20} 
                                color={theme.colors.primary} 
                            />
                            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
                                {theme.isDark ? t('darkMode') : t('lightMode')}
                            </Text>
                        </View>
                        <Text style={[styles.previewDescription, { color: theme.colors.secondaryText }]}>
                            {theme.mode === 'system' 
                                ? t('themeAutoApplied')
                                : t('themeApplied')}
                        </Text>
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
        paddingBottom: 40,
    },
    descriptionSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    previewSection: {
        marginTop: 32,
        paddingHorizontal: 20,
    },
    previewLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    previewCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    previewDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
});

export default ThemeSettingScreen;
