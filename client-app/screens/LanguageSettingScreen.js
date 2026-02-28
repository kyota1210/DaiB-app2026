import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const LanguageSettingScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { language, activeLanguage, changeLanguage, t } = useLanguage();

    const languageOptions = [
        {
            id: 'ja',
            title: '日本語',
            subtitle: 'Japanese',
            icon: 'language',
        },
        {
            id: 'en',
            title: 'English',
            subtitle: '英語',
            icon: 'language',
        },
        {
            id: 'system',
            title: 'システム設定に従う',
            subtitle: 'Follow System Settings',
            icon: 'phone-portrait',
        },
    ];

    const handleLanguageSelect = (languageId) => {
        changeLanguage(languageId);
    };

    return (
        <SafeAreaView 
            style={[styles.container, { backgroundColor: '#000000' }]} 
            edges={['top']}
        >
            {/* ヘッダー */}
            <View style={[styles.header, { 
                backgroundColor: '#000000',
                borderBottomColor: theme.colors.border 
            }]}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {t('languageSettings')}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView 
                style={[styles.scrollView, { backgroundColor: '#000000' }]}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 説明文 */}
                <View style={styles.descriptionSection}>
                    <Text style={[styles.descriptionText, { color: theme.colors.secondaryText }]}>
                        {t('selectLanguage')}
                    </Text>
                </View>

                {/* 言語選択リスト */}
                <View style={[styles.optionsContainer, { backgroundColor: '#000000' }]}>
                    {languageOptions.map((option, index) => {
                        const isSelected = language === option.id;
                        const isLast = index === languageOptions.length - 1;

                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionItem,
                                    !isLast && { 
                                        borderBottomWidth: 1, 
                                        borderBottomColor: theme.colors.border 
                                    }
                                ]}
                                onPress={() => handleLanguageSelect(option.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Ionicons 
                                        name={option.icon} 
                                        size={28} 
                                        color={isSelected ? theme.colors.primary : theme.colors.icon} 
                                    />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={[
                                        styles.optionTitle, 
                                        { color: theme.colors.text }
                                    ]}>
                                        {option.title}
                                    </Text>
                                    <Text style={[
                                        styles.optionSubtitle, 
                                        { color: theme.colors.secondaryText }
                                    ]}>
                                        {option.subtitle}
                                    </Text>
                                </View>
                                {isSelected && (
                                    <View style={styles.checkmarkContainer}>
                                        <Ionicons 
                                            name="checkmark-circle" 
                                            size={24} 
                                            color={theme.colors.primary} 
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 現在の言語情報 */}
                <View style={styles.currentLanguageSection}>
                    <Text style={[styles.currentLanguageLabel, { color: theme.colors.secondaryText }]}>
                        {t('currentLanguage')}
                    </Text>
                    <View style={[
                        styles.currentLanguageCard, 
                        { 
                            backgroundColor: '#000000',
                            borderColor: theme.colors.border 
                        }
                    ]}>
                        <View style={styles.currentLanguageHeader}>
                            <Ionicons 
                                name="language" 
                                size={20} 
                                color={theme.colors.primary} 
                            />
                            <Text style={[styles.currentLanguageTitle, { color: theme.colors.text }]}>
                                {activeLanguage === 'ja' ? t('japanese') : t('english')}
                            </Text>
                        </View>
                        <Text style={[styles.currentLanguageDescription, { color: theme.colors.secondaryText }]}>
                            {language === 'system' 
                                ? t('languageAutoApplied')
                                : t('languageApplied')}
                        </Text>
                    </View>
                </View>

                {/* 注意事項 */}
                <View style={styles.noteSection}>
                    <View style={[styles.noteCard, {
                        backgroundColor: theme.isDark ? '#2a2a2a' : '#f8f9fa',
                        borderColor: theme.colors.border
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
    header: {
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
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 32,
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
    optionsContainer: {
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    optionIconContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    optionSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    checkmarkContainer: {
        marginLeft: 12,
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

