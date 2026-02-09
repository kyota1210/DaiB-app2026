import React, { useState, useCallback, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Alert, ActivityIndicator, TouchableOpacity, Image, ScrollView, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRecordsApi } from '../api/records';
import { fetchCategories, updateCategory } from '../api/categories';
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

// 日付を yyyy/mm/dd 形式にフォーマットする関数
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
};

// ギャラリーアイテムコンポーネント
const GalleryItem = ({ item, navigation, allRecords, itemIndex, viewMode = 'grid', theme }) => {
    const imageUrl = getImageUrl(item.image_url);

    // 表示形式に応じたスタイルを選択
    const getItemStyle = () => {
        if (viewMode === 'list') {
            return [styles.listItem, { backgroundColor: theme.colors.card }];
        } else if (viewMode === 'booklist') {
            return styles.bookListItem;
        } else {
            return styles.galleryCard;
        }
    };

    const getImageStyle = () => {
        if (viewMode === 'list') {
            return styles.listImage;
        } else if (viewMode === 'booklist') {
            return styles.bookListImage;
        } else {
            return styles.galleryImage;
        }
    };

    const getContainerStyle = () => {
        if (viewMode === 'list') {
            return styles.listImageContainer;
        } else if (viewMode === 'booklist') {
            return styles.bookListImageContainer;
        } else {
            return styles.imageContainer;
        }
    };

    return (
        <TouchableOpacity 
            style={getItemStyle()} 
            onPress={() => navigation.navigate('RecordDetail', { 
                records: allRecords,
                initialIndex: itemIndex
            })}
            activeOpacity={0.9}
        >
            <View style={getContainerStyle()}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={getImageStyle()} />
                ) : (
                    <View style={[getContainerStyle(), styles.placeholderGalleryImage]}>
                        <Ionicons name="image" size={30} color="#ccc" />
                    </View>
                )}
                {viewMode === 'list' && item.date_logged && (
                    <View style={styles.listDateContainer}>
                        <Text style={styles.listDateText}>
                            {formatDate(item.date_logged)}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default function RecordListScreen({ navigation }) {
    const [recordsByCategory, setRecordsByCategory] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'booklist'
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    
    const { fetchRecords } = useRecordsApi();
    const { userInfo, userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const horizontalScrollViewRef = useRef(null);
    const categoryScrollViewRefs = useRef({});

    // カテゴリーを取得する関数
    const loadCategories = useCallback(async () => {
        try {
            const fetchedCategories = await fetchCategories(userToken);
            if (fetchedCategories.length > 0) {
                const allCategory = { id: 'all', name: 'All', icon: 'apps' };
                const newCategories = [allCategory, ...fetchedCategories];
                setCategories(newCategories);
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error('カテゴリー取得エラー:', error);
            setCategories([]);
        }
    }, [userToken]);

    // カテゴリーを更新する関数
    const handleUpdateCategory = async () => {
        if (!categoryName.trim()) {
            Alert.alert('エラー', 'カテゴリー名を入力してください');
            return;
        }

        setLoading(true);
        try {
            await updateCategory(userToken, editingCategory.id, {
                name: categoryName.trim(),
            });

            await loadCategories(); // カテゴリー一覧を再取得
            setShowEditModal(false);
            setEditingCategory(null);
            setCategoryName('');
            Alert.alert('完了', 'カテゴリーを更新しました');
        } catch (error) {
            console.error('カテゴリー更新エラー:', error);
            Alert.alert('エラー', error.message || 'カテゴリーの更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 編集モーダルを閉じる
    const resetEditForm = () => {
        setShowEditModal(false);
        setEditingCategory(null);
        setCategoryName('');
    };

    // 記録を取得する関数（特定のカテゴリ用）
    const loadRecordsForCategory = useCallback(async (categoryId) => {
        try {
            const id = categoryId === 'all' ? null : categoryId;
            const data = await fetchRecords(id);
            setRecordsByCategory(prev => ({
                ...prev,
                [categoryId]: data
            }));
            return data;
        } catch (error) {
            console.error(`カテゴリ ${categoryId} の記録取得エラー:`, error);
            return [];
        }
    }, [fetchRecords]);

    // 全カテゴリの記録を取得
    const loadAllRecords = useCallback(async () => {
        setLoading(true);
        try {
            // Allカテゴリのデータを取得
            const allRecords = await loadRecordsForCategory('all');
            
            // 各カテゴリのデータも取得
            if (categories.length > 0) {
                const categoryPromises = categories
                    .filter(cat => cat.id !== 'all')
                    .map(cat => loadRecordsForCategory(cat.id));
                await Promise.all(categoryPromises);
            }
        } catch (error) {
            Alert.alert('エラー', '記録の取得に失敗しました: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [loadRecordsForCategory, categories]);

    // 空の状態を表示する共通関数
    const renderEmpty = () => {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={theme.colors.border} />
                <Text style={[styles.emptyText, { color: theme.colors.border }]}>{t('noRecords')}</Text>
            </View>
        );
    };

    // グリッド表示（横3列のスクエア表示）
    const renderGrid = (records) => {
        if (!records || records.length === 0) {
            return renderEmpty();
        }

        const rows = [];
        for (let i = 0; i < records.length; i += 3) {
            const rowItems = records.slice(i, i + 3);
            rows.push(
                <View key={`row-${i}`} style={styles.rowContainer}>
                    {rowItems.map((item, index) => (
                        <GalleryItem 
                            key={item.id} 
                            item={item} 
                            navigation={navigation}
                            allRecords={records}
                            itemIndex={i + index}
                            viewMode="grid"
                            theme={theme}
                        />
                    ))}
                </View>
            );
        }
        return rows;
    };

    // リスト表示（縦一列で横長）
    const renderList = (records) => {
        if (!records || records.length === 0) {
            return renderEmpty();
        }

        return (
            <View style={styles.listContainer}>
                {records.map((item, index) => (
                    <GalleryItem 
                        key={item.id} 
                        item={item} 
                        navigation={navigation}
                        allRecords={records}
                        itemIndex={index}
                        viewMode="list"
                        theme={theme}
                    />
                ))}
            </View>
        );
    };

    // ブックリスト表示（横3列で縦長表示）
    const renderBookList = (records) => {
        if (!records || records.length === 0) {
            return renderEmpty();
        }

        const rows = [];
        for (let i = 0; i < records.length; i += 3) {
            const rowItems = records.slice(i, i + 3);
            rows.push(
                <View key={`row-${i}`} style={styles.rowContainer}>
                    {rowItems.map((item, index) => (
                        <GalleryItem 
                            key={item.id} 
                            item={item} 
                            navigation={navigation}
                            allRecords={records}
                            itemIndex={i + index}
                            viewMode="booklist"
                            theme={theme}
                        />
                    ))}
                </View>
            );
        }
        return rows;
    };

    // 表示形式に応じたレンダリング関数を選択
    const renderRecords = (records) => {
        if (viewMode === 'list') {
            return renderList(records);
        } else if (viewMode === 'booklist') {
            return renderBookList(records);
        } else {
            return renderGrid(records);
        }
    };

    // カテゴリタブUIコンポーネント
    const renderCategoryTabs = () => {
        if (categories.length === 0) return null;

        return (
            <View style={[styles.categoryTabsContainer, { 
                backgroundColor: theme.colors.background
            }]}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryTabsContent}
                >
                    {categories.map((category, index) => {
                        const isSelected = selectedCategory === category.id;
                        const isAllCategory = category.id === 'all';
                        
                        return (
                            <TouchableOpacity
                                key={category.id}
                                style={[
                                    styles.categoryTab,
                                    isAllCategory && styles.categoryTabIcon,
                                    {
                                        backgroundColor: theme.colors.secondaryBackground
                                    },
                                    isSelected && styles.categoryTabSelected
                                ]}
                                onPress={() => {
                                    isScrollingRef.current = true;
                                    setSelectedCategory(category.id);
                                    // 横スクロールビューを対応するページに移動
                                    if (horizontalScrollViewRef.current) {
                                        horizontalScrollViewRef.current.scrollTo({
                                            x: index * SCREEN_WIDTH,
                                            animated: true
                                        });
                                    }
                                    setTimeout(() => {
                                        isScrollingRef.current = false;
                                    }, 300);
                                }}
                                onLongPress={() => {
                                    // "All"カテゴリは編集できないので、長押しを無効化
                                    if (!isAllCategory) {
                                        setEditingCategory(category);
                                        setCategoryName(category.name);
                                        setShowEditModal(true);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                {isAllCategory ? (
                                    <View style={styles.categoryTabContent}>
                                        <Ionicons 
                                            name="apps" 
                                            size={20} 
                                            color={theme.colors.text} 
                                        />
                                        {isSelected && <View style={styles.categoryTabUnderline} />}
                                    </View>
                                ) : (
                                    <View style={styles.categoryTabContent}>
                                        <Text style={[
                                            styles.categoryTabText,
                                            { color: theme.colors.text }
                                        ]}>
                                            {category.name}
                                        </Text>
                                        {isSelected && <View style={styles.categoryTabUnderline} />}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };


    // 縦スクロール時の処理（各カテゴリの画像グリッド内）
    const handleVerticalScroll = (event, categoryId) => {
        // スクロール処理（必要に応じて追加の処理を実装可能）
    };

    // 横スワイプ時の処理
    const handleHorizontalScroll = (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
        
        if (pageIndex >= 0 && pageIndex < categories.length) {
            const newCategory = categories[pageIndex];
            if (newCategory && newCategory.id !== selectedCategory) {
                isScrollingRef.current = true;
                setSelectedCategory(newCategory.id);
                setTimeout(() => {
                    isScrollingRef.current = false;
                }, 300);
            }
        }
    };

    // カテゴリが変更された時に、対応するページにスクロール（プログラムによる変更時のみ）
    const isScrollingRef = useRef(false);
    React.useEffect(() => {
        if (categories.length > 0 && horizontalScrollViewRef.current && !isScrollingRef.current) {
            const categoryIndex = categories.findIndex(cat => cat.id === selectedCategory);
            if (categoryIndex >= 0) {
                horizontalScrollViewRef.current.scrollTo({
                    x: categoryIndex * SCREEN_WIDTH,
                    animated: true
                });
            }
        }
    }, [selectedCategory, categories.length]);

    // 画面が表示されるたびにデータを再取得
    useFocusEffect(
        useCallback(() => {
            loadCategories();
        }, [loadCategories])
    );
    
    // カテゴリが読み込まれたら全カテゴリの記録を取得
    React.useEffect(() => {
        if (categories.length > 0) {
            loadAllRecords();
        }
    }, [categories.length, loadAllRecords]);

    // 初期表示時に選択されたカテゴリのページにスクロール
    React.useEffect(() => {
        if (categories.length > 0 && horizontalScrollViewRef.current) {
            const initialIndex = categories.findIndex(cat => cat.id === selectedCategory);
            if (initialIndex >= 0) {
                setTimeout(() => {
                    horizontalScrollViewRef.current?.scrollTo({
                        x: initialIndex * SCREEN_WIDTH,
                        animated: false
                    });
                }, 100);
            }
        }
    }, [categories.length]);

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
                        style={styles.viewModeButton}
                        onPress={() => {
                            // 表示形式を切り替え: grid -> list -> booklist -> grid
                            if (viewMode === 'grid') {
                                setViewMode('list');
                            } else if (viewMode === 'list') {
                                setViewMode('booklist');
                            } else {
                                setViewMode('grid');
                            }
                        }}
                    >
                        {viewMode === 'booklist' ? (
                            <View style={{ transform: [{ rotate: '90deg' }] }}>
                                <Ionicons 
                                    name="reorder-three-outline"
                                    size={24} 
                                    color={theme.colors.icon} 
                                />
                            </View>
                        ) : (
                            <Ionicons 
                                name={
                                    viewMode === 'grid' ? 'grid-outline' : 
                                    'list-outline'
                                } 
                                size={24} 
                                color={theme.colors.icon} 
                            />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.settingsButton}
                        onPress={() => navigation.navigate('MyPage')}
                    >
                        <Ionicons name="settings-outline" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ユーザー情報ヘッダー */}
            <View style={[styles.userHeaderContainer, { 
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border 
            }]}>
                {/* Profileアイコンとプロフィール情報 */}
                <View style={styles.profileSection}>
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
                    </TouchableOpacity>

                    {/* ユーザー名とアーカイブ情報 */}
                    <View style={styles.userInfoSection}>
                        <Text style={[styles.userNameText, { color: theme.colors.text }]}>
                            {userInfo?.user_name || 'ゲスト'}
                        </Text>
                        <Text style={[styles.totalArchives, { color: theme.colors.inactive }]}>
                            Total Archives: {(recordsByCategory[selectedCategory] || []).length}
                        </Text>
                    </View>
                </View>

                {/* 投稿ボタン（右側） */}
                <TouchableOpacity 
                    style={styles.createButton}
                    onPress={() => navigation.navigate('PhotoPicker')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={28} color={theme.colors.icon} />
                </TouchableOpacity>
            </View>

            <View style={styles.mainContent}>
                {/* カテゴリタブUI */}
                {renderCategoryTabs()}

                {/* 横スワイプ可能なカテゴリビュー */}
                <ScrollView
                    ref={horizontalScrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleHorizontalScroll}
                    scrollEventThrottle={16}
                    style={styles.horizontalScrollView}
                >
                    {categories.map((category) => {
                        const categoryRecords = recordsByCategory[category.id] || [];
                        return (
                            <ScrollView
                                key={category.id}
                                ref={(ref) => {
                                    if (ref) {
                                        categoryScrollViewRefs.current[category.id] = ref;
                                    }
                                }}
                                onScroll={(e) => handleVerticalScroll(e, category.id)}
                                scrollEventThrottle={16}
                                contentContainerStyle={styles.scrollContent}
                                style={styles.categoryPage}
                            >
                                <View style={styles.gridContainer}>
                                    {renderRecords(categoryRecords)}
                                </View>
                            </ScrollView>
                        );
                    })}
                </ScrollView>
            </View>

            {/* カテゴリー編集モーダル */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={true}
                onRequestClose={resetEditForm}
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
                                    カテゴリーを編集
                                </Text>
                                <TouchableOpacity onPress={resetEditForm}>
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
                                    onPress={resetEditForm}
                                >
                                    <Text style={[styles.cancelButtonText, { color: theme.colors.secondaryText }]}>
                                        キャンセル
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                                    onPress={handleUpdateCategory}
                                    disabled={loading}
                                >
                                    <Text style={styles.saveButtonText}>
                                        更新
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
    viewModeButton: {
        padding: 4,
        marginRight: 12,
    },
    settingsButton: {
        padding: 4,
    },
    userHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    createButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
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
    iconLabel: {
        fontSize: 11,
        marginTop: 6,
        textAlign: 'center',
    },
    iconLabelSelected: {
        fontWeight: 'bold',
    },
    userInfoSection: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
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
    categoryTabsContainer: {
        paddingVertical: 6,
    },
    categoryTabsContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
        paddingVertical: 2,
    },
    categoryTab: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 36,
    },
    categoryTabIcon: {
        minWidth: 50,
        paddingHorizontal: 12,
    },
    categoryTabSelected: {
        // 選択時のスタイル（下線は別途追加）
    },
    categoryTabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    categoryTabUnderline: {
        position: 'absolute',
        bottom: -8,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#4CAF50',
        borderRadius: 1,
    },
    categoryTabText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    horizontalScrollView: {
        flex: 1,
    },
    categoryPage: {
        width: SCREEN_WIDTH,
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
    // リスト表示用スタイル
    listContainer: {
        width: '100%',
        paddingHorizontal: 8,
    },
    listItem: {
        width: '100%',
        height: 150,
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        padding: 4,
    },
    listImageContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
    },
    listImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    listDateContainer: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    listDateText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#fff',
    },
    // ブックリスト表示用スタイル
    bookListItem: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.5, // 縦長（1.5倍）
        marginRight: IMAGE_PADDING,
        overflow: 'hidden',
    },
    bookListImageContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
    },
    bookListImage: {
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
});
