import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useRecordsAndCategories } from '../context/RecordsAndCategoriesContext';
import { createCategory, updateCategory, deleteCategory } from '../api/categories';
import ScreenHeader from '../components/ScreenHeader';
import ResultModal from '../components/ResultModal';

const CategoryManagementScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { categories, loadCategories, loadingCategories } = useRecordsAndCategories();

    // デフォルトカテゴリー（削除不可、DBには保存しない）
    const defaultCategories = [
        { id: 'all', name: 'All', icon: 'apps', isDefault: true },
    ];

    // ユーザーカスタムカテゴリー（Context のキャッシュから 'all' を除いた一覧）
    const customCategories = categories.filter(c => c.id !== 'all');
    const [savingCategory, setSavingCategory] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [successAction, setSuccessAction] = useState(''); // 'add', 'update', 'delete'

    // 画面フォーカス時にキャッシュを更新（Context の loadCategories を使用）
    useFocusEffect(
        React.useCallback(() => {
            loadCategories();
        }, [loadCategories])
    );



    const handleAddCategory = async () => {
        if (!categoryName.trim()) {
            setErrorMessage('カテゴリー名を入力してください');
            setShowErrorModal(true);
            return;
        }
        if (categoryName.trim().length > 25) {
            setErrorMessage('カテゴリー名は25文字以内で入力してください');
            setShowErrorModal(true);
            return;
        }

        setSavingCategory(true);
        try {
            await createCategory(userToken, {
                name: categoryName.trim(),
            });

            await loadCategories(); // キャッシュを更新
            resetForm();
            setSuccessAction('add');
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 2000);
        } catch (error) {
            console.error('カテゴリー作成エラー:', error);
            setErrorMessage(error.message || 'カテゴリーの追加に失敗しました');
            setShowErrorModal(true);
        } finally {
            setSavingCategory(false);
        }
    };

    const handleEditCategory = async () => {
        if (!categoryName.trim()) {
            setErrorMessage('カテゴリー名を入力してください');
            setShowErrorModal(true);
            return;
        }
        if (categoryName.trim().length > 25) {
            setErrorMessage('カテゴリー名は25文字以内で入力してください');
            setShowErrorModal(true);
            return;
        }

        setSavingCategory(true);
        try {
            await updateCategory(userToken, editingCategory.id, {
                name: categoryName.trim(),
            });

            await loadCategories(); // キャッシュを更新
            resetForm();
            setSuccessAction('update');
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 2000);
        } catch (error) {
            console.error('カテゴリー更新エラー:', error);
            setErrorMessage(error.message || 'カテゴリーの更新に失敗しました');
            setShowErrorModal(true);
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = (category) => {
        setCategoryToDelete(category);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeleteCategory = async () => {
        if (!categoryToDelete) return;
        
        setShowDeleteConfirmModal(false);
        setSavingCategory(true);
        try {
            await deleteCategory(userToken, categoryToDelete.id);
            await loadCategories(); // キャッシュを更新
            setCategoryToDelete(null);
            setSuccessAction('delete');
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 2000);
        } catch (error) {
            console.error('カテゴリー削除エラー:', error);
            setErrorMessage(error.message || 'カテゴリーの削除に失敗しました');
            setShowErrorModal(true);
        } finally {
            setSavingCategory(false);
        }
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setCategoryName(category.name);
        setShowAddModal(true);
    };

    const resetForm = () => {
        setShowAddModal(false);
        setEditingCategory(null);
        setCategoryName('');
    };

    const allCategories = [...defaultCategories, ...customCategories];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title="カテゴリー管理" onBack={() => navigation.goBack()} />

            <ScrollView style={[styles.scrollView, { backgroundColor: theme.colors.background }]}>
                {/* カテゴリーリスト */}
                <View style={styles.section}>
                    <View style={[styles.categoryList, { backgroundColor: theme.colors.background }]}>
                        {allCategories.map((category) => (
                            <View key={category.id} style={[styles.categoryCard, {
                                borderBottomColor: theme.colors.border
                            }]}>
                                <View style={styles.categoryInfo}>
                                    {category.id === 'all' && (
                                        <View 
                                            style={[
                                                styles.categoryIconCircle, 
                                                { backgroundColor: theme.colors.secondaryBackground }
                                            ]}
                                        >
                                            <Ionicons name={category.icon} size={24} color={theme.colors.text} />
                                        </View>
                                    )}
                                    <Text style={[styles.categoryNameText, { color: theme.colors.text }]}>
                                        {category.name}
                                    </Text>
                                </View>
                                {!category.isDefault && (
                                    <View style={styles.categoryActions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => openEditModal(category)}
                                        >
                                            <Ionicons name="pencil-sharp" size={22} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleDeleteCategory(category)}
                                        >
                                            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* 追加ボタン */}
                <View style={styles.addButtonSection}>
                    <TouchableOpacity 
                        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Ionicons name="add-circle" size={24} color="#fff" />
                        <Text style={styles.addButtonText}>新しいカテゴリーを追加</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* カテゴリー追加・編集モーダル */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent={true}
                onRequestClose={resetForm}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.modalOverlayContent}>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                    {editingCategory ? 'カテゴリーを編集' : '新しいカテゴリー'}
                                </Text>
                                <TouchableOpacity onPress={resetForm}>
                                    <Ionicons name="close" size={28} color={theme.colors.icon} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                style={styles.modalBody}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {/* カテゴリー名 */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.colors.text }]}>カテゴリー名</Text>
                                    <TextInput
                                        style={[styles.input, {
                                            backgroundColor: theme.colors.secondaryBackground,
                                            borderColor: theme.colors.border,
                                            color: theme.colors.text
                                        }]}
                                        value={categoryName}
                                        onChangeText={setCategoryName}
                                        placeholder="例: 本、映画、音楽、植物"
                                        placeholderTextColor={theme.colors.inactive}
                                        autoFocus={true}
                                        maxLength={25}
                                        textContentType="none"
                                    />
                                </View>

                            </ScrollView>

                            {/* ボタン */}
                            <View style={[styles.modalFooter, { 
                                borderTopColor: theme.colors.border,
                                backgroundColor: theme.colors.card
                            }]}>
                                <TouchableOpacity 
                                    style={[styles.cancelButton, {
                                        backgroundColor: theme.colors.secondaryBackground,
                                        borderColor: theme.colors.border
                                    }]}
                                    onPress={resetForm}
                                >
                                    <Text style={[styles.cancelButtonText, { color: theme.colors.secondaryText }]}>
                                        キャンセル
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                                    onPress={editingCategory ? handleEditCategory : handleAddCategory}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {editingCategory ? '更新' : '追加'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 成功モーダル（記録投稿完了と同様のコンパクト表示） */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <TouchableOpacity
                    style={[styles.successOverlay, { paddingTop: insets.top + 12 }]}
                    activeOpacity={1}
                    onPress={() => setShowSuccessModal(false)}
                >
                    <View style={[styles.successModalContent, { backgroundColor: theme.colors.card }]}>
                        <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary} style={styles.successIcon} />
                        <Text style={[styles.successMessage, { color: theme.colors.text }]}>
                            {successAction === 'delete' ? 'カテゴリーを削除しました' : successAction === 'update' ? 'カテゴリーを更新しました' : 'カテゴリーを追加しました'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Modal>

            <ResultModal
                type="error"
                visible={showErrorModal}
                title="エラー"
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />

            <ResultModal
                type="confirm"
                visible={showDeleteConfirmModal}
                title="カテゴリーを削除"
                message={`「${categoryToDelete?.name}」を削除しますか？`}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDeleteCategory}
                cancelLabel="キャンセル"
                confirmLabel="削除"
            />
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
        marginHorizontal: 16,
        marginBottom: 16,
    },
    categoryList: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 16,
    },
    categoryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryNameText: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    defaultBadge: {
        backgroundColor: '#E0E0E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    defaultBadgeText: {
        fontSize: 11,
        color: '#666',
    },
    categoryActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    addButtonSection: {
        padding: 16,
    },
    addButton: {
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 8,
    },
    // モーダルスタイル
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalOverlayContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '92%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    modalBody: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 12,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 20,
        paddingBottom: 32,
        borderTopWidth: 1,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        marginRight: 8,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 16,
        marginLeft: 8,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        letterSpacing: 0.2,
    },
    successOverlay: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    successModalContent: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        minWidth: 300,
        maxWidth: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    successIcon: {
        marginRight: 10,
    },
    successMessage: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        flexShrink: 0,
    },
});

export default CategoryManagementScreen;
