import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchCategories, createCategory, updateCategory, deleteCategory, uploadCategoryImage, deleteCategoryImage } from '../api/categories';
import { getImageUrl } from '../utils/imageHelper';

const CategoryManagementScreen = ({ navigation }) => {
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    
    // デフォルトカテゴリー（削除不可、DBには保存しない）
    const defaultCategories = [
        { id: 'all', name: 'All', icon: 'apps', color: theme.colors.primary, isDefault: true },
    ];

    // ユーザーカスタムカテゴリー
    const [customCategories, setCustomCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('bookmark');
    const [selectedColor, setSelectedColor] = useState(theme.colors.primary);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageToDelete, setImageToDelete] = useState(false);

    // カテゴリーを読み込む関数
    const loadCategories = React.useCallback(async () => {
        setLoading(true);
        try {
            const categories = await fetchCategories(userToken);
            setCustomCategories(categories);
        } catch (error) {
            console.error('カテゴリー取得エラー:', error);
            Alert.alert('エラー', 'カテゴリーの取得に失敗しました');
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

    // アイコン選択肢
    const availableIcons = [
        'bookmark', 'cafe', 'film', 'calendar', 'airplane', 'camera', 
        'book', 'musical-notes', 'fitness', 'car', 'home', 'gift', 
        'heart', 'star', 'wine', 'restaurant', 'leaf', 'game-controller', 
        'color-palette', 'paw'
    ];

    // カラー選択肢
    const availableColors = [
        '#007AFF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#C7CEEA',
        '#FF9800', '#9C27B0', '#4CAF50', '#FF5722', '#795548', '#607D8B',
        '#000000'
    ];

    // 画像を選択
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('エラー', '画像ライブラリへのアクセス許可が必要です');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            setImageToDelete(false);
        }
    };

    // 画像を削除
    const removeImage = () => {
        setSelectedImage(null);
        setImageToDelete(true);
    };

    const handleAddCategory = async () => {
        if (!categoryName.trim()) {
            Alert.alert('エラー', 'カテゴリー名を入力してください');
            return;
        }

        setLoading(true);
        try {
            const newCategory = await createCategory(userToken, {
                name: categoryName.trim(),
                icon: selectedIcon,
                color: selectedColor,
            });
            
            // 画像がある場合はアップロード
            if (selectedImage) {
                await uploadCategoryImage(userToken, newCategory.id, selectedImage);
            }

            await loadCategories(); // カテゴリー一覧を再取得
            resetForm();
            Alert.alert('完了', 'カテゴリーを追加しました');
        } catch (error) {
            console.error('カテゴリー作成エラー:', error);
            Alert.alert('エラー', error.message || 'カテゴリーの追加に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleEditCategory = async () => {
        if (!categoryName.trim()) {
            Alert.alert('エラー', 'カテゴリー名を入力してください');
            return;
        }

        setLoading(true);
        try {
            await updateCategory(userToken, editingCategory.id, {
                name: categoryName.trim(),
                icon: selectedIcon,
                color: selectedColor,
            });
            
            // 画像の変更処理
            if (imageToDelete && editingCategory.image_url) {
                // 画像を削除
                await deleteCategoryImage(userToken, editingCategory.id);
            } else if (selectedImage && selectedImage !== editingCategory.image_url) {
                // 新しい画像をアップロード
                await uploadCategoryImage(userToken, editingCategory.id, selectedImage);
            }

            await loadCategories(); // カテゴリー一覧を再取得
            resetForm();
            Alert.alert('完了', 'カテゴリーを更新しました');
        } catch (error) {
            console.error('カテゴリー更新エラー:', error);
            Alert.alert('エラー', error.message || 'カテゴリーの更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = (category) => {
        Alert.alert(
            'カテゴリーを削除',
            `「${category.name}」を削除しますか？`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await deleteCategory(userToken, category.id);
                            await loadCategories(); // カテゴリー一覧を再取得
                            Alert.alert('完了', 'カテゴリーを削除しました');
                        } catch (error) {
                            console.error('カテゴリー削除エラー:', error);
                            Alert.alert('エラー', error.message || 'カテゴリーの削除に失敗しました');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setCategoryName(category.name);
        setSelectedIcon(category.icon);
        setSelectedColor(category.color);
        setSelectedImage(category.image_url ? getImageUrl(category.image_url) : null);
        setImageToDelete(false);
        setShowAddModal(true);
    };

    const resetForm = () => {
        setShowAddModal(false);
        setEditingCategory(null);
        setCategoryName('');
        setSelectedIcon('bookmark');
        setSelectedColor(theme.colors.primary);
        setSelectedImage(null);
        setImageToDelete(false);
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
                                            { backgroundColor: category.color }
                                        ]}
                                    >
                                        {category.image_url ? (
                                            <Image 
                                                source={{ uri: getImageUrl(category.image_url) }} 
                                                style={styles.categoryImage}
                                            />
                                        ) : (
                                            <Ionicons name={category.icon} size={24} color="#fff" />
                                        )}
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
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                {editingCategory ? 'カテゴリーを編集' : '新しいカテゴリー'}
                            </Text>
                            <TouchableOpacity onPress={resetForm}>
                                <Ionicons name="close" size={28} color={theme.colors.icon} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* 画像選択 */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>カテゴリー画像</Text>
                                <View style={styles.imagePickerContainer}>
                                    {(selectedImage && !imageToDelete) ? (
                                        <View style={styles.imagePreviewContainer}>
                                            <Image 
                                                source={{ uri: selectedImage }} 
                                                style={styles.selectedImagePreview}
                                            />
                                            <TouchableOpacity 
                                                style={styles.removeImageButton}
                                                onPress={removeImage}
                                            >
                                                <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={[styles.imagePickerButton, {
                                                backgroundColor: theme.colors.secondaryBackground,
                                                borderColor: theme.colors.border
                                            }]}
                                            onPress={pickImage}
                                        >
                                            <Ionicons name="image" size={32} color={theme.colors.secondaryText} />
                                            <Text style={[styles.imagePickerText, { color: theme.colors.secondaryText }]}>
                                                画像を選択
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

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
                                />
                            </View>

                            {/* アイコン選択 */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>アイコン</Text>
                                <View style={styles.iconGrid}>
                                    {availableIcons.map((icon) => (
                                        <TouchableOpacity
                                            key={icon}
                                            style={[
                                                styles.iconOption,
                                                { 
                                                    backgroundColor: theme.colors.secondaryBackground,
                                                    borderColor: 'transparent'
                                                },
                                                selectedIcon === icon && [
                                                    styles.iconOptionSelected,
                                                    { 
                                                        borderColor: theme.colors.primary,
                                                        backgroundColor: theme.isDark ? '#1a3a5c' : '#E8F4FF'
                                                    }
                                                ]
                                            ]}
                                            onPress={() => setSelectedIcon(icon)}
                                        >
                                            <Ionicons 
                                                name={icon} 
                                                size={28} 
                                                color={selectedIcon === icon ? theme.colors.primary : theme.colors.secondaryText} 
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* カラー選択 */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>カラー</Text>
                                <View style={styles.colorGrid}>
                                    {availableColors.map((color) => (
                                        <TouchableOpacity
                                            key={color}
                                            style={[
                                                styles.colorOption,
                                                { backgroundColor: color },
                                                selectedColor === color && styles.colorOptionSelected
                                            ]}
                                            onPress={() => setSelectedColor(color)}
                                        >
                                            {selectedColor === color && (
                                                <Ionicons name="checkmark" size={20} color="#fff" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* プレビュー */}
                            <View style={styles.previewSection}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>プレビュー</Text>
                                <View style={[styles.previewCard, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border
                                }]}>
                                    <View 
                                        style={[
                                            styles.previewIcon, 
                                            { backgroundColor: selectedColor }
                                        ]}
                                    >
                                        {(selectedImage && !imageToDelete) ? (
                                            <Image 
                                                source={{ uri: selectedImage }} 
                                                style={styles.previewImageStyle}
                                            />
                                        ) : (
                                            <Ionicons name={selectedIcon} size={32} color="#fff" />
                                        )}
                                    </View>
                                    <Text style={[styles.previewText, { color: theme.colors.text }]}>
                                        {categoryName || 'カテゴリー名'}
                                    </Text>
                                </View>
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
        overflow: 'hidden',
    },
    categoryImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
    imagePickerContainer: {
        marginTop: 4,
    },
    imagePickerButton: {
        height: 120,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePickerText: {
        marginTop: 8,
        fontSize: 14,
    },
    imagePreviewContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    selectedImagePreview: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: '35%',
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 0,
        marginHorizontal: -4,
        justifyContent: 'flex-start',
    },
    iconOption: {
        width: '14.36%',
        aspectRatio: 1,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
        borderWidth: 2,
    },
    iconOptionSelected: {
        transform: [{ scale: 1.05 }],
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 0,
        marginHorizontal: -4,
    },
    colorOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
        transform: [{ scale: 1.1 }],
    },
    previewSection: {
        marginTop: 8,
        marginBottom: 12,
    },
    previewCard: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
    },
    previewIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    previewImageStyle: {
        width: 88,
        height: 88,
        borderRadius: 44,
    },
    previewText: {
        fontSize: 19,
        fontWeight: '600',
        letterSpacing: 0.3,
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
});

export default CategoryManagementScreen;
