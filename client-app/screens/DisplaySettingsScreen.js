import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { updateDisplaySettings } from '../api/user';

const VIEW_MODES = [
    { id: 'grid', icon: 'grid-outline', iconSelected: 'grid' },
    { id: 'list', icon: 'list-outline', iconSelected: 'list' },
    { id: 'booklist', icon: 'reorder-three-outline', iconSelected: 'reorder-three', rotate: true },
    { id: 'tile', icon: 'apps-outline', iconSelected: 'apps' },
];

const SORT_OPTIONS = [
    { id: 'date_logged' },
    { id: 'created_at' },
];

const DisplaySettingsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { userInfo, userToken, authContext } = useContext(AuthContext);
    const currentMode = userInfo?.default_view_mode || 'grid';
    const currentSortOrder = userInfo?.default_sort_order || 'date_logged';
    const [selectedMode, setSelectedMode] = useState(currentMode);
    const [selectedSortOrder, setSelectedSortOrder] = useState(currentSortOrder);
    const [saving, setSaving] = useState(false);

    const getViewModeLabel = (id) => {
        switch (id) {
            case 'grid': return t('viewModeGrid');
            case 'list': return t('viewModeList');
            case 'booklist': return t('viewModeBooklist');
            case 'tile': return t('viewModeTile');
            default: return id;
        }
    };

    const getSortOrderLabel = (id) => {
        switch (id) {
            case 'date_logged': return t('sortByDateLogged');
            case 'created_at': return t('sortByCreatedAt');
            default: return id;
        }
    };

    const hasChanges = selectedMode !== currentMode || selectedSortOrder !== currentSortOrder;

    const handleSave = async () => {
        if (saving || !hasChanges) {
            navigation.goBack();
            return;
        }
        setSaving(true);
        try {
            const res = await updateDisplaySettings(userToken, {
                default_view_mode: selectedMode,
                default_sort_order: selectedSortOrder,
            });
            if (res?.user) {
                authContext.updateUserInfo(res.user);
            }
            navigation.goBack();
        } catch (err) {
            console.error('Display settings save error', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('displaySettings')}</Text>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving || !hasChanges}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Text style={[styles.saveButtonText, { color: hasChanges ? theme.colors.primary : theme.colors.inactive }]}>
                            {t('save')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.descriptionSection}>
                    <Text style={[styles.descriptionText, { color: theme.colors.secondaryText }]}>
                        {t('selectDefaultViewMode')}
                    </Text>
                </View>

                <View style={[styles.optionsContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    {VIEW_MODES.map((option, index) => {
                        const isSelected = selectedMode === option.id;
                        const isLast = index === VIEW_MODES.length - 1;

                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionItem,
                                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
                                ]}
                                onPress={() => setSelectedMode(option.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.optionIconContainer, option.rotate && { transform: [{ rotate: '90deg' }] }]}>
                                    <Ionicons
                                        name={isSelected ? option.iconSelected : option.icon}
                                        size={24}
                                        color={isSelected ? theme.colors.primary : theme.colors.icon}
                                    />
                                </View>
                                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                                    {getViewModeLabel(option.id)}
                                </Text>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={[styles.descriptionSection, { paddingTop: 8 }]}>
                    <Text style={[styles.descriptionText, { color: theme.colors.secondaryText }]}>
                        {t('selectDefaultSortOrder')}
                    </Text>
                </View>

                <View style={[styles.optionsContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    {SORT_OPTIONS.map((option, index) => {
                        const isSelected = selectedSortOrder === option.id;
                        const isLast = index === SORT_OPTIONS.length - 1;

                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionItem,
                                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
                                ]}
                                onPress={() => setSelectedSortOrder(option.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={24}
                                        color={isSelected ? theme.colors.primary : theme.colors.icon}
                                    />
                                </View>
                                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                                    {getSortOrderLabel(option.id)}
                                </Text>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
    saveButton: { minWidth: 56, alignItems: 'flex-end', padding: 8 },
    saveButtonText: { fontSize: 16, fontWeight: '600' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    descriptionSection: { paddingHorizontal: 20, paddingVertical: 16 },
    descriptionText: { fontSize: 14, lineHeight: 20 },
    optionsContainer: {
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    optionIconContainer: { marginRight: 12 },
    optionTitle: { flex: 1, fontSize: 16 },
});

export default DisplaySettingsScreen;
