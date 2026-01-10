import React, { useState, useCallback, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Alert, ActivityIndicator, TouchableOpacity, Image, ScrollView, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRecordsApi } from '../api/records';
import { fetchCategories, uploadCategoryImage, deleteCategoryImage } from '../api/categories';
import { useFocusEffect } from '@react-navigation/native';
import { getImageUrl } from '../utils/imageHelper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SERVER_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_PADDING = 1; // 画像間の余白
const COLUMN_WIDTH = (SCREEN_WIDTH - IMAGE_PADDING * 4) / 3; // 3列

// 日付を "2024 October" 形式にフォーマットするヘルパー
const formatFloatingDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.toLocaleString('en-US', { month: 'long' });
    return `${year} ${month}`;
};

// ギャラリーアイテムコンポーネント
const GalleryItem = ({ item, navigation }) => {
    const imageUrl = getImageUrl(item.image_url);

    return (
        <TouchableOpacity 
            style={styles.galleryCard} 
            onPress={() => navigation.navigate('RecordDetail', { record: item })}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.galleryImage} />
                ) : (
                    <View style={styles.placeholderGalleryImage}>
                        <Ionicons name="image" size={30} color="#ccc" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default function RecordListScreen({ navigation }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [currentDateLabel, setCurrentDateLabel] = useState('');
    const [showDateLabel, setShowDateLabel] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    
    const { fetchRecords } = useRecordsApi();
    const { userInfo, userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const scrollTimeout = useRef(null);

    // カテゴリーを取得する関数
    const loadCategories = useCallback(async () => {
        try {
            const fetchedCategories = await fetchCategories(userToken);
            if (fetchedCategories.length > 0) {
                const allCategory = { id: 'all', name: 'All', icon: 'apps', color: theme.colors.primary };
                const newCategories = [allCategory, ...fetchedCategories];
                setCategories(newCategories);
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error('カテゴリー取得エラー:', error);
            setCategories([]);
        }
    }, [userToken, theme.colors.primary]);

    // 記録を取得する関数
    const loadRecords = useCallback(async () => {
        setLoading(true);
        try {
            const categoryId = selectedCategory === 'all' ? null : selectedCategory;
            const data = await fetchRecords(categoryId);
            setRecords(data);
            if (data.length > 0) {
                setCurrentDateLabel(formatFloatingDate(data[0].date_logged));
            }
        } catch (error) {
            Alert.alert('エラー', '記録の取得に失敗しました: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [fetchRecords, selectedCategory]);

    const renderGrid = () => {
        const rows = [];
        for (let i = 0; i < records.length; i += 3) {
            const rowItems = records.slice(i, i + 3);
            rows.push(
                <View key={`row-${i}`} style={styles.rowContainer}>
                    {rowItems.map((item) => (
                        <GalleryItem 
                            key={item.id} 
                            item={item} 
                            navigation={navigation}
                        />
                    ))}
                </View>
            );
        }
        return rows;
    };

    // 画像を選択してアップロード
    const pickImageForCategory = async () => {
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
            try {
                setLoading(true);
                await uploadCategoryImage(userToken, editingCategory.id, result.assets[0].uri);
                await loadCategories();
                setShowImageModal(false);
                setEditingCategory(null);
                Alert.alert('完了', 'カテゴリー画像を更新しました');
            } catch (error) {
                console.error('画像アップロードエラー:', error);
                Alert.alert('エラー', error.message || '画像のアップロードに失敗しました');
            } finally {
                setLoading(false);
            }
        }
    };

    // 画像を削除
    const removeImageFromCategory = async () => {
        try {
            setLoading(true);
            await deleteCategoryImage(userToken, editingCategory.id);
            await loadCategories();
            setShowImageModal(false);
            setEditingCategory(null);
            Alert.alert('完了', 'カテゴリー画像を削除しました');
        } catch (error) {
            console.error('画像削除エラー:', error);
            Alert.alert('エラー', error.message || '画像の削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 長押しでモーダルを表示
    const handleLongPressCategory = (category) => {
        if (category.id === 'all') return; // Allカテゴリは編集不可
        setEditingCategory(category);
        setShowImageModal(true);
    };

    // スクロール時の処理
    const handleScroll = (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        
        // 日付ラベルを表示
        setShowDateLabel(true);
        
        // スクロール停止を検知してラベルを隠す
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            setShowDateLabel(false);
        }, 1500);

        // 現在表示されているアイテムから日付を推定（簡易版）
        const itemIndex = Math.floor(offsetY / 200); // 概算のアイテム高さ
        const targetItem = records[itemIndex * 2]; // 2列なので
        if (targetItem) {
            const label = formatFloatingDate(targetItem.date_logged);
            if (label !== currentDateLabel) {
                setCurrentDateLabel(label);
            }
        }
    };

    // 画面が表示されるたびにデータを再取得
    useFocusEffect(
        useCallback(() => {
            loadCategories();
            loadRecords();
        }, [loadCategories, loadRecords])
    );
    
    // カテゴリー変更時に記録を再取得
    React.useEffect(() => {
        if (categories.length > 0) {
            loadRecords();
        }
    }, [selectedCategory]);

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // データを3カラムに分割
    // (この部分は不要になりましたが、削除することで他のコードに影響を与えないようコメントアウトします)
    // const leftColumnData = records.filter((_, i) => i % 3 === 0);
    // const midColumnData = records.filter((_, i) => i % 3 === 1);
    // const rightColumnData = records.filter((_, i) => i % 3 === 2);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* トップナビゲーションバー */}
            <View style={[styles.topNavBar, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.appName, { color: theme.colors.text }]}>Otium</Text>
                <View style={styles.iconButtons}>
                    <TouchableOpacity 
                        style={styles.insightButton}
                        onPress={() => navigation.navigate('Insight')}
                    >
                        <Ionicons name="analytics-outline" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ユーザー情報ヘッダー */}
            <View style={[styles.userHeaderContainer, { 
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border 
            }]}>
                {/* アイコン横一列エリア */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.iconScrollContainer}
                    contentContainerStyle={styles.iconScrollContent}
                >
                    {/* ユーザーアイコン */}
                    <TouchableOpacity 
                        style={styles.iconItem}
                        onPress={() => navigation.navigate('ProfileEdit')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.userIconContainer, { 
                            backgroundColor: theme.colors.secondaryBackground,
                            borderColor: theme.colors.border 
                        }]}>
                            {userInfo?.avatar_url ? (
                                <Image 
                                    source={{ uri: `${SERVER_URL}/${userInfo.avatar_url}` }} 
                                    style={styles.userAvatar}
                                />
                            ) : (
                                <Ionicons name="person-circle-outline" size={68} color={theme.colors.icon} />
                            )}
                        </View>
                        <Text style={[styles.iconLabel, { color: theme.colors.secondaryText }]}>
                            Profile
                        </Text>
                    </TouchableOpacity>

                    {/* カテゴリアイコン */}
                    {categories.length > 0 && categories.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={styles.iconItem}
                            onPress={() => setSelectedCategory(category.id)}
                            onLongPress={() => handleLongPressCategory(category)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.categoryIconCircle,
                                selectedCategory === category.id && styles.categoryIconCircleSelected,
                                { 
                                    backgroundColor: category.color ? `${category.color}20` : theme.colors.secondaryBackground,
                                    borderColor: selectedCategory === category.id ? (category.color || theme.colors.primary) : 'transparent'
                                }
                            ]}>
                                {category.image_url ? (
                                    <Image 
                                        source={{ uri: getImageUrl(category.image_url) }} 
                                        style={styles.categoryImage}
                                    />
                                ) : (
                                    <Ionicons 
                                        name={category.icon} 
                                        size={32} 
                                        color={category.color || theme.colors.secondaryText} 
                                    />
                                )}
                            </View>
                            <Text style={[
                                styles.iconLabel,
                                { color: theme.colors.secondaryText },
                                selectedCategory === category.id && [styles.iconLabelSelected, { color: theme.colors.text }]
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ユーザー名とアーカイブ情報 */}
                <View style={styles.userInfoSection}>
                    <Text style={[styles.userNameText, { color: theme.colors.text }]}>
                        {selectedCategory === 'all' 
                            ? (userInfo?.user_name || 'ゲスト')
                            : categories.find(cat => cat.id === selectedCategory)?.name || (userInfo?.user_name || 'ゲスト')
                        }
                    </Text>
                    <Text style={[styles.totalArchives, { color: theme.colors.inactive }]}>
                        Total Archives: {records.length}
                    </Text>
                </View>
            </View>

            <View style={styles.mainContent}>
                <ScrollView 
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.scrollContent}
                >
                    {records.length > 0 ? (
                        <View style={styles.gridContainer}>
                            {renderGrid()}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={64} color={theme.colors.border} />
                            <Text style={[styles.emptyText, { color: theme.colors.border }]}>{t('noRecords')}</Text>
                            <Text style={[styles.emptySubText, { color: theme.colors.inactive }]}>
                                {t('createFirstRecord')}
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* フローティング日付インジケーター */}
                {showDateLabel && currentDateLabel !== '' && (
                    <View style={styles.floatingDateContainer}>
                        <Text style={[styles.floatingDateText, { 
                            color: theme.isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' 
                        }]}>
                            {currentDateLabel}
                        </Text>
                    </View>
                )}
            </View>

            {/* カテゴリ画像変更モーダル */}
            <Modal
                visible={showImageModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setShowImageModal(false);
                    setEditingCategory(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.imageModalContent, { backgroundColor: theme.colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                カテゴリー画像を変更
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setShowImageModal(false);
                                setEditingCategory(null);
                            }}>
                                <Ionicons name="close" size={28} color={theme.colors.icon} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            {editingCategory && (
                                <View style={styles.currentImageContainer}>
                                    <View 
                                        style={[
                                            styles.modalCategoryIconCircle, 
                                            { backgroundColor: editingCategory.color }
                                        ]}
                                    >
                                        {editingCategory.image_url ? (
                                            <Image 
                                                source={{ uri: getImageUrl(editingCategory.image_url) }} 
                                                style={styles.modalCategoryImage}
                                            />
                                        ) : (
                                            <Ionicons 
                                                name={editingCategory.icon} 
                                                size={48} 
                                                color="#fff" 
                                            />
                                        )}
                                    </View>
                                    <Text style={[styles.categoryNameInModal, { color: theme.colors.text }]}>
                                        {editingCategory.name}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity 
                                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                                onPress={pickImageForCategory}
                            >
                                <Ionicons name="image" size={24} color="#fff" />
                                <Text style={styles.modalButtonText}>画像を選択</Text>
                            </TouchableOpacity>

                            {editingCategory?.image_url && (
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.deleteButton, { 
                                        backgroundColor: theme.colors.secondaryBackground,
                                        borderColor: '#FF3B30'
                                    }]}
                                    onPress={removeImageFromCategory}
                                >
                                    <Ionicons name="trash" size={24} color="#FF3B30" />
                                    <Text style={[styles.modalButtonText, { color: '#FF3B30' }]}>
                                        画像を削除
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
    },
    topNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 2,
        paddingBottom: 0,
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    iconButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    insightButton: {
        padding: 4,
        marginRight: 12,
    },
    notificationButton: {
        padding: 4,
    },
    userHeaderContainer: {
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    iconScrollContainer: {
        paddingHorizontal: 16,
    },
    iconScrollContent: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    iconItem: {
        alignItems: 'center',
        marginRight: 16,
    },
    userIconContainer: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    userAvatar: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
    },
    categoryIconCircle: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        overflow: 'hidden',
    },
    categoryIconCircleSelected: {
        // 選択時のスタイル
    },
    categoryImage: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
    },
    iconLabel: {
        fontSize: 11,
        marginTop: 6,
        textAlign: 'center',
    },
    iconLabelSelected: {
        fontWeight: 'bold',
    },
    userInfoSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
        alignItems: 'flex-start',
    },
    userNameText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalArchives: {
        fontSize: 13,
        marginTop: 2,
    },
    mainContent: {
        flex: 1,
        position: 'relative',
    },
    scrollContent: {
        padding: IMAGE_PADDING,
    },
    gridContainer: {
        width: '100%',
    },
    rowContainer: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: IMAGE_PADDING,
    },
    galleryCard: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH,
        marginRight: IMAGE_PADDING,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderGalleryImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingDateContainer: {
        position: 'absolute',
        bottom: 40, // 下部に配置
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    floatingDateText: {
        fontSize: 14,
        fontWeight: '300',
        letterSpacing: 4,
        textTransform: 'uppercase',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    imageModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        paddingHorizontal: 24,
        paddingVertical: 24,
        paddingBottom: 40,
    },
    currentImageContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    modalCategoryIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    modalCategoryImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    categoryNameInModal: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    deleteButton: {
        borderWidth: 2,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
});
