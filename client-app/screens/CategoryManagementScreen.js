import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../api/categories';

const CategoryManagementScreen = ({ navigation }) => {
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    
    // デフォルトカテゴリー（削除不可、DBには保存しない）
    const defaultCategories = [
        { id: 'all', name: 'All', icon: 'apps', isDefault: true },
    ];

    // ユーザーカスタムカテゴリー
    const [customCategories, setCustomCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [successAction, setSuccessAction] = useState(''); // 'add', 'update', 'delete'

    // カテゴリーを読み込む関数
    const loadCategories = React.useCallback(async () => {
        setLoading(true);
        try {
            const categories = await fetchCategories(userToken);
            setCustomCategories(categories);
        } catch (error) {
            console.error('カテゴリー取得エラー:', error);
            setErrorMessage('カテゴリーの取得に失敗しました');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    }, [userToken]);

    // 画面表示時にカテゴリーを取得
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

        setLoading(true);
        try {
            await createCategory(userToken, {
                name: categoryName.trim(),
            });

            await loadCategories(); // カテゴリー一覧を再取得
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
            setLoading(false);
        }
    };

    const handleEditCategory = async () => {
        if (!categoryName.trim()) {
            setErrorMessage('カテゴリー名を入力してください');
            setShowErrorModal(true);
            return;
        }

        setLoading(true);
        try {
            await updateCategory(userToken, editingCategory.id, {
                name: categoryName.trim(),
            });

            await loadCategories(); // カテゴリー一覧を再取得
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
            setLoading(false);
        }
    };

    const handleDeleteCategory = (category) => {
        setCategoryToDelete(category);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeleteCategory = async () => {
        if (!categoryToDelete) return;
        
        setShowDeleteConfirmModal(false);
        setLoading(true);
        try {
            await deleteCategory(userToken, categoryToDelete.id);
            await loadCategories(); // カテゴリー一覧を再取得
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
            setLoading(false);
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
            {/* トップナビゲーションバー */}
            <View style={[styles.topNavBar, {
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border
            }]}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>カテゴリー管理</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={[styles.scrollView, { backgroundColor: theme.colors.secondaryBackground }]}>
                {/* カテゴリーリスト */}
                <View style={styles.section}>
                    <View style={[styles.categoryList, { backgroundColor: theme.colors.card }]}>
                        {allCategories.map((category) => (
                            <View key={category.id} style={[styles.categoryCard, {
                                borderBottomColor: theme.colors.border
                            }]}>
                                <View style={styles.categoryInfo}>
                                    <View 
                                        style={[
                                            styles.categoryIconCircle, 
                                            { backgroundColor: theme.colors.secondaryBackground }
                                        ]}
                                    >
                                        <Ionicons name={category.icon} size={24} color={theme.colors.text} />
                                    </View>
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
                                            <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
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
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
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
                                        placeholder="例: 読書、運動、料理"
                                        placeholderTextColor={theme.colors.inactive}
                                        autoFocus={true}
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

            {/* 成功モーダル */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.successModalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowSuccessModal(false)}
                    >
                        <View style={[styles.successModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.successIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                                <Ionicons name="checkmark-circle" size={48} color={theme.colors.primary} />
                            </View>
                            <Text style={[styles.successTitle, { color: theme.colors.text }]}>
                                完了
                            </Text>
                            <Text style={[styles.successMessage, { color: theme.colors.secondaryText }]}>
                                {successAction === 'delete' ? 'カテゴリーを削除しました' : successAction === 'update' ? 'カテゴリーを更新しました' : 'カテゴリーを追加しました'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </BlurView>
            </Modal>

            {/* エラーモーダル */}
            <Modal
                visible={showErrorModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowErrorModal(false)}
            >
                <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.successModalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowErrorModal(false)}
                    >
                        <View style={[styles.errorModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.errorIconContainer, { backgroundColor: '#FF3B30' + '20' }]}>
                                <Ionicons name="close-circle" size={48} color="#FF3B30" />
                            </View>
                            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                                エラー
                            </Text>
                            <Text style={[styles.errorMessage, { color: theme.colors.secondaryText }]}>
                                {errorMessage}
                            </Text>
                            <TouchableOpacity
                                style={[styles.errorButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => setShowErrorModal(false)}
                            >
                                <Text style={styles.errorButtonText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </BlurView>
            </Modal>

            {/* 削除確認モーダル */}
            <Modal
                visible={showDeleteConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirmModal(false)}
            >
                <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.successModalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowDeleteConfirmModal(false)}
                    >
                        <View style={[styles.confirmModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.confirmIconContainer, { backgroundColor: '#FF3B30' + '20' }]}>
                                <Ionicons name="trash-outline" size={48} color="#FF3B30" />
                            </View>
                            <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>
                                カテゴリーを削除
                            </Text>
                            <Text style={[styles.confirmMessage, { color: theme.colors.secondaryText }]}>
                                「{categoryToDelete?.name}」を削除しますか？
                            </Text>
                            <View style={styles.confirmButtonContainer}>
                                <TouchableOpacity
                                    style={[styles.confirmCancelButton, { borderColor: theme.colors.border }]}
                                    onPress={() => setShowDeleteConfirmModal(false)}
                                >
                                    <Text style={[styles.confirmCancelButtonText, { color: theme.colors.text }]}>
                                        キャンセル
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmDeleteButton}
                                    onPress={confirmDeleteCategory}
                                >
                                    <Text style={styles.confirmDeleteButtonText}>
                                        削除
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </BlurView>
            </Modal>
        </SafeAreaView>
    );
};

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
    successModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlayTouchable: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModalContent: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        minWidth: 280,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    successIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    errorModalContent: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        minWidth: 280,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    errorIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    errorButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 20,
        minWidth: 120,
    },
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    confirmModalContent: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        minWidth: 280,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    confirmIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    confirmButtonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    confirmCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    confirmDeleteButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
    },
    confirmDeleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CategoryManagementScreen;
