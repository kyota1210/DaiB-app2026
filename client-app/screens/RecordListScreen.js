import React, { useState, useCallback, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Alert, ActivityIndicator, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRecordsApi } from '../api/records';
import { fetchCategories } from '../api/categories';
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
const GalleryItem = ({ item, navigation, allRecords, itemIndex }) => {
    const imageUrl = getImageUrl(item.image_url);

    return (
        <TouchableOpacity 
            style={styles.galleryCard} 
            onPress={() => navigation.navigate('RecordDetail', { 
                records: allRecords,
                initialIndex: itemIndex
            })}
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
    const [recordsByCategory, setRecordsByCategory] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [currentDateLabel, setCurrentDateLabel] = useState('');
    const [showDateLabel, setShowDateLabel] = useState(false);
    
    const { fetchRecords } = useRecordsApi();
    const { userInfo, userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const scrollTimeout = useRef(null);
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
    }, [userToken, theme.colors.primary]);

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
            
            if (allRecords.length > 0) {
                setCurrentDateLabel(formatFloatingDate(allRecords[0].date_logged));
            }
        } catch (error) {
            Alert.alert('エラー', '記録の取得に失敗しました: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [loadRecordsForCategory, categories]);

    const renderGrid = (records) => {
        if (!records || records.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={64} color={theme.colors.border} />
                    <Text style={[styles.emptyText, { color: theme.colors.border }]}>{t('noRecords')}</Text>
                    <Text style={[styles.emptySubText, { color: theme.colors.inactive }]}>
                        {t('createFirstRecord')}
                    </Text>
                </View>
            );
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
                        />
                    ))}
                </View>
            );
        }
        return rows;
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
                                    isSelected && [
                                        styles.categoryTabSelected, 
                                        { backgroundColor: '#FF8C42' }
                                    ],
                                    !isSelected && {
                                        backgroundColor: theme.colors.secondaryBackground
                                    }
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
                                activeOpacity={0.7}
                            >
                                {isAllCategory ? (
                                    <Ionicons 
                                        name="apps" 
                                        size={20} 
                                        color={isSelected ? '#fff' : theme.colors.text} 
                                    />
                                ) : (
                                    <Text style={[
                                        styles.categoryTabText,
                                        { color: isSelected ? '#fff' : theme.colors.text }
                                    ]}>
                                        {category.name}
                                    </Text>
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
        const offsetY = event.nativeEvent.contentOffset.y;
        const records = recordsByCategory[categoryId] || [];
        
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
                        <Text style={[styles.iconLabel, { color: theme.colors.secondaryText }]}>
                            Profile
                        </Text>
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
                                    {renderGrid(categoryRecords)}
                                </View>
                            </ScrollView>
                        );
                    })}
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
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
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
});
