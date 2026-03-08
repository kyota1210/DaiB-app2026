import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';
import OptionsList from '../components/OptionsList';

const LanguageSettingScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { language, activeLanguage, changeLanguage, t } = useLanguage();

    const languageOptions = [
        {
            id: 'ja',
            title: '日本語',
            description: 'Japanese',
            icon: 'language',
        },
        {
            id: 'en',
            title: 'English',
            description: '英語',
            icon: 'language',
        },
        {
            id: 'system',
            title: 'システム設定に従う',
            description: 'Follow System Settings',
            icon: 'phone-portrait',
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('languageSettings')} onBack={() => navigation.goBack()} />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.descriptionSection}>
                    <Text style={[styles.descriptionText, { color: theme.colors.secondaryText }]}>
                        {t('selectLanguage')}
                    </Text>
                </View>

                <OptionsList
                    options={languageOptions}
                    selectedId={language}
                    onSelect={changeLanguage}
                />

                <View style={styles.currentLanguageSection}>
                    <Text style={[styles.currentLanguageLabel, { color: theme.colors.secondaryText }]}>
                        {t('currentLanguage')}
                    </Text>
                    <View style={[styles.currentLanguageCard, {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                    }]}>
                        <View style={styles.currentLanguageHeader}>
                            <Ionicons name="language" size={20} color={theme.colors.primary} />
                            <Text style={[styles.currentLanguageTitle, { color: theme.colors.text }]}>
                                {activeLanguage === 'ja' ? t('japanese') : t('english')}
                            </Text>
                        </View>
                        <Text style={[styles.currentLanguageDescription, { color: theme.colors.secondaryText }]}>
                            {language === 'system' ? t('languageAutoApplied') : t('languageApplied')}
                        </Text>
                    </View>
                </View>

                <View style={styles.noteSection}>
                    <View style={[styles.noteCard, {
                        backgroundColor: theme.isDark ? '#2a2a2a' : '#f8f9fa',
                        borderColor: theme.colors.border,
                    }]}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                        <Text style={[styles.noteText, { color: theme.colors.secondaryText }]}>
                            {t('languageChangeNote')}
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
    currentLanguageSection: {
        marginTop: 32,
        paddingHorizontal: 20,
    },
    currentLanguageLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    currentLanguageCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    currentLanguageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    currentLanguageTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    currentLanguageDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    noteSection: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    noteCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'flex-start',
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
        marginLeft: 12,
    },
});

export default LanguageSettingScreen;
