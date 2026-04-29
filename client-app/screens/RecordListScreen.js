import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Alert, ActivityIndicator, TouchableOpacity, Image, ScrollView, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { updateCategory } from '../api/categories';
import { useFocusEffect } from '@react-navigation/native';
import { getImageUrl } from '../utils/imageHelper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useRecordsAndCategories } from '../context/RecordsAndCategoriesContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SERVER_URL } from '../config';
import RecordCalendarSection from '../components/RecordCalendarSection';
import RecordHeatmapSection from '../components/RecordHeatmapSection';
import RecordLifeTimelineSection from '../components/RecordLifeTimelineSection';
import AdBanner from '../components/AdBanner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_PADDING = 1; // 画像間の余白
const COLUMN_WIDTH = (SCREEN_WIDTH - IMAGE_PADDING * 4) / 3; // 3列
// タイル表示（他ユーザープロフィール同様: 隙間あり・正方形・3列）
const TILE_PADDING = 16;
const TILE_GAP = 8;
const TILE_SIZE = (SCREEN_WIDTH - TILE_PADDING * 2 - TILE_GAP * (3 - 1)) / 3;

const LIST_AREA_MODES = ['gallery', 'calendar', 'heatmap', 'lifeTimeline'];

function advanceListAreaMode(prev) {
    const i = LIST_AREA_MODES.indexOf(prev);
    return LIST_AREA_MODES[(i + 1) % LIST_AREA_MODES.length];
}

function listAreaModeIcon(mode) {
    switch (mode) {
        case 'calendar':
            return 'calendar';
        case 'heatmap':
            return 'flame';
        case 'lifeTimeline':
            return 'git-branch-outline';
        default:
            return 'calendar-outline';
    }
}

// 日付を yyyy/mm/dd 形式にフォーマットする関数
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
};

// ギャラリーアイテム（一覧はセルに合わせた cover 表示）
const GalleryItem = ({ item, navigation, allRecords, itemIndex, viewMode = 'grid', theme }) => {
    const imageUrl = getImageUrl(item.image_url);

    const getItemStyle = () => {
        if (viewMode === 'list') {
            return [styles.listItem, { backgroundColor: theme.colors.card }];
        }
        if (viewMode === 'booklist') {
            return styles.bookListItem;
        }
        if (viewMode === 'tile') {
            return [styles.tileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }];
        }
        return styles.galleryCard;
    };

    const getImageStyle = () => {
        if (viewMode === 'list') return styles.listImage;
        if (viewMode === 'booklist') return styles.bookListImage;
        if (viewMode === 'tile') return styles.tileImage;
        return styles.galleryImage;
    };

    const getContainerStyle = () => {
        if (viewMode === 'list') return styles.listImageContainer;
        if (viewMode === 'booklist') return styles.bookListImageContainer;
        if (viewMode === 'tile') return styles.tileImageContainer;
        return styles.imageContainer;
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
                    <Image source={{ uri: imageUrl }} style={getImageStyle()} resizeMode="cover" />
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
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'booklist', 'tile'
    const [listAreaMode, setListAreaMode] = useState('gallery'); // gallery | calendar | heatmap | lifeTimeline
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [expandedBio, setExpandedBio] = useState(false);
    const [showCategorySuccessModal, setShowCategorySuccessModal] = useState(false);
    const [showCategoryErrorModal, setShowCategoryErrorModal] = useState(false);
    const [categoryErrorMessage, setCategoryErrorMessage] = useState('');
    const [updatingCategory, setUpdatingCategory] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    /** 横カテゴリ ScrollView の縦幅（カレンダーは子で flex が効かないため明示高さに使う） */
    const [horizontalPagerHeight, setHorizontalPagerHeight] = useState(0);

    const insets = useSafeAreaInsets();
    const { categories, recordsByCategory, records, loadCategories, loadRecords, loadingCategories, loadingRecords } = useRecordsAndCategories();
    const { userInfo, userToken } = useContext(AuthContext);
    const { isPremium } = useSubscription();
    const { theme } = useTheme();
    const { t, activeLanguage } = useLanguage();
    const horizontalScrollViewRef = useRef(null);
    const categoryScrollViewRefs = useRef({});
    const categoryTabsScrollRef = useRef(null);
    const categoryTabLayoutsRef = useRef({});

    // カテゴリーを更新する関数
    const handleUpdateCategory = async () => {
        if (!categoryName.trim()) {
            setCategoryErrorMessage('カテゴリー名を入力してください');
            setShowCategoryErrorModal(true);
            return;
        }

        setUpdatingCategory(true);
        try {
            await updateCategory(userToken, editingCategory.id, {
                name: categoryName.trim(),
            });

            await loadCategories(); // キャッシュを更新
            setShowEditModal(false);
            setEditingCategory(null);
            setCategoryName('');
            setShowCategorySuccessModal(true);
            setTimeout(() => {
                setShowCategorySuccessModal(false);
            }, 2000);
        } catch (error) {
            console.error('カテゴリー更新エラー:', error);
            setCategoryErrorMessage(error.message || 'カテゴリーの更新に失敗しました');
            setShowCategoryErrorModal(true);
        } finally {
            setUpdatingCategory(false);
        }
    };

    // 編集モーダルを閉じる
    const resetEditForm = () => {
        setShowEditModal(false);
        setEditingCategory(null);
        setCategoryName('');
    };

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

    // タイル表示（隙間あり・正方形・3列・他ユーザープロフィール同様）
    const renderTile = (records) => {
        if (!records || records.length === 0) {
            return renderEmpty();
        }

        const rows = [];
        for (let i = 0; i < records.length; i += 3) {
            const rowItems = records.slice(i, i + 3);
            rows.push(
                <View key={`tile-row-${i}`} style={styles.tileRowContainer}>
                    {rowItems.map((item, index) => (
                        <GalleryItem 
                            key={item.id} 
                            item={item} 
                            navigation={navigation}
                            allRecords={records}
                            itemIndex={i + index}
                            viewMode="tile"
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
        } else if (viewMode === 'tile') {
            return renderTile(records);
        } else {
            return renderGrid(records);
        }
    };

    // カテゴリタブUIコンポーネント（liquid glass風）
    const renderCategoryTabs = () => {
        if (categories.length === 0) return null;

        return (
            <View style={styles.categoryTabsContainer}>
                <ScrollView 
                    ref={categoryTabsScrollRef}
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
                                    isSelected && styles.categoryTabSelected
                                ]}
                                onLayout={(e) => {
                                    const { x, width } = e.nativeEvent.layout;
                                    categoryTabLayoutsRef.current[index] = { x, width };
                                }}
                                onPress={() => {
                                    isScrollingRef.current = true;
                                    setSelectedCategory(category.id);
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
                                    if (isAllCategory) {
                                        navigation.navigate('CategoryManagement');
                                    } else {
                                        setEditingCategory(category);
                                        setCategoryName(category.name);
                                        setShowEditModal(true);
                                    }
                                }}
                                activeOpacity={0.85}
                            >
                                <View style={[
                                    styles.categoryTabGlass,
                                    isSelected && styles.categoryTabGlassSelected
                                ]}>
                                    <BlurView
                                        intensity={60}
                                        tint="light"
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    <View style={styles.categoryTabGlassContent}>
                                        {isAllCategory ? (
                                            <View style={styles.categoryTabContent}>
                                                <Ionicons 
                                                    name="apps" 
                                                    size={18} 
                                                    color={theme.colors.text} 
                                                />
                                            </View>
                                        ) : (
                                            <View style={styles.categoryTabContent}>
                                                <Text style={[
                                                    styles.categoryTabText,
                                                    { color: theme.colors.text }
                                                ]}>
                                                    {category.name}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
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

    // 選択中のカテゴリタブが画面内に収まるようにタブバーをスクロール
    React.useEffect(() => {
        const scrollRef = categoryTabsScrollRef.current;
        const layouts = categoryTabLayoutsRef.current;
        if (!scrollRef || categories.length === 0) return;
        const categoryIndex = categories.findIndex(cat => cat.id === selectedCategory);
        if (categoryIndex < 0) return;
        const layout = layouts[categoryIndex];
        if (!layout) return;
        const { x: tabX, width: tabWidth } = layout;
        const scrollX = Math.max(0, tabX - SCREEN_WIDTH / 2 + tabWidth / 2);
        scrollRef.scrollTo({ x: scrollX, animated: true });
    }, [selectedCategory, categories.length]);

    // プルダウンで一覧を更新
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const start = Date.now();
        try {
            await Promise.all([loadCategories(), loadRecords()]);
        } finally {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 1000 - elapsed);
            if (remaining > 0) {
                await new Promise((r) => setTimeout(r, remaining));
            }
            setRefreshing(false);
        }
    }, [loadCategories, loadRecords]);

    // 画面フォーカス時にキャッシュを更新（キャッシュがあれば即表示し、バックグラウンドで再取得）
    useFocusEffect(
        useCallback(() => {
            loadCategories();
            loadRecords();
        }, [loadCategories, loadRecords])
    );

    // フォーカス時にデフォルト表示形式を反映（表示設定で変更した場合など）
    useFocusEffect(
        useCallback(() => {
            const defaultMode = userInfo?.default_view_mode || 'grid';
            setViewMode(defaultMode);
        }, [userInfo?.default_view_mode])
    );

    // 投稿日（date_logged）の新しい順で固定ソート
    const sortByDateLoggedDesc = useCallback((records) => {
        if (!records || records.length === 0) return records || [];
        return [...records].sort((a, b) => {
            const ta = a.date_logged ? new Date(a.date_logged).getTime() : 0;
            const tb = b.date_logged ? new Date(b.date_logged).getTime() : 0;
            return tb - ta;
        });
    }, []);

    const calendarPagerViewportHeight =
        horizontalPagerHeight > 0
            ? horizontalPagerHeight
            : Math.round(SCREEN_HEIGHT * 0.5);

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

    const showInitialLoading = (loadingCategories && categories.length === 0) || (loadingRecords && records.length === 0);
    if (showInitialLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* トップナビゲーションバー */}
            <View style={[styles.topNavBar, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.appName, { color: theme.colors.text }]}>DaiB</Text>
                <View style={styles.iconButtons}>
                    <TouchableOpacity
                        style={styles.viewModeButton}
                        onPress={() => setListAreaMode((prev) => advanceListAreaMode(prev))}
                    >
                        <Ionicons
                            name={listAreaModeIcon(listAreaMode)}
                            size={24}
                            color={listAreaMode !== 'gallery' ? theme.colors.primary : theme.colors.icon}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.viewModeButton}
                        onPress={() => {
                            setListAreaMode('gallery');
                            // 表示形式を切り替え: grid -> list -> booklist -> tile -> grid
                            if (viewMode === 'grid') {
                                setViewMode('list');
                            } else if (viewMode === 'list') {
                                setViewMode('booklist');
                            } else if (viewMode === 'booklist') {
                                setViewMode('tile');
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
                        ) : viewMode === 'tile' ? (
                            <Ionicons 
                                name="apps-outline"
                                size={24} 
                                color={theme.colors.icon} 
                            />
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
                                    key={`avatar-${userInfo.updated_at || ''}`}
                                    source={{ 
                                        uri: getImageUrl(userInfo.avatar_url, userInfo.updated_at),
                                        cache: 'reload',
                                    }} 
                                    style={styles.userAvatar}
                                />
                            ) : (
                                <View style={styles.userAvatarPlaceholder}>
                                    <Ionicons name="person-circle-outline" size={80} color={theme.colors.icon} />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* ユーザー名と自己紹介 */}
                    <View style={styles.userInfoSection}>
                        <Text style={[styles.userNameText, { color: theme.colors.text }]}>
                            {userInfo?.user_name || 'ゲスト'}
                        </Text>
                        {userInfo?.bio && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setExpandedBio(!expandedBio)}
                            >
                                <Text 
                                    style={[styles.userBio, { color: theme.colors.secondaryText }]} 
                                    numberOfLines={expandedBio ? undefined : 3}
                                >
                                    {userInfo.bio}
                                </Text>
                            </TouchableOpacity>
                        )}
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

                {!isPremium ? (
                    <View
                        style={[
                            styles.adBannerBelowTabs,
                            { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background },
                        ]}
                    >
                        <AdBanner />
                    </View>
                ) : null}

                {/* 横スワイプ可能なカテゴリビュー */}
                <ScrollView
                    ref={horizontalScrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleHorizontalScroll}
                    scrollEventThrottle={16}
                    style={styles.horizontalScrollView}
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (h > 0) {
                            setHorizontalPagerHeight((prev) =>
                                Math.abs(prev - h) < 1 ? prev : h
                            );
                        }
                    }}
                    contentContainerStyle={
                        listAreaMode === 'calendar'
                            ? styles.horizontalPagerContentCalendar
                            : undefined
                    }
                >
                    {categories.map((category) => {
                        const categoryRecords = recordsByCategory[category.id] || [];
                        const sortedCategoryRecords = sortByDateLoggedDesc(categoryRecords);
                        const calendarMode = listAreaMode === 'calendar';

                        const gridBody = (
                            <View
                                style={[
                                    styles.gridContainer,
                                    calendarMode && styles.gridContainerCalendar,
                                ]}
                            >
                                {listAreaMode === 'calendar' ? (
                                    <RecordCalendarSection
                                        records={sortedCategoryRecords}
                                        theme={theme}
                                        navigation={navigation}
                                        language={activeLanguage}
                                        containerHeight={calendarPagerViewportHeight}
                                    />
                                ) : listAreaMode === 'heatmap' ? (
                                    <RecordHeatmapSection
                                        records={sortedCategoryRecords}
                                        theme={theme}
                                        navigation={navigation}
                                        language={activeLanguage}
                                        t={t}
                                    />
                                ) : listAreaMode === 'lifeTimeline' ? (
                                    <RecordLifeTimelineSection
                                        records={sortedCategoryRecords}
                                        theme={theme}
                                        navigation={navigation}
                                        language={activeLanguage}
                                        t={t}
                                    />
                                ) : (
                                    renderRecords(sortedCategoryRecords)
                                )}
                            </View>
                        );

                        if (calendarMode) {
                            return (
                                <View
                                    key={category.id}
                                    style={[
                                        styles.categoryPage,
                                        {
                                            width: SCREEN_WIDTH,
                                            height: calendarPagerViewportHeight,
                                        },
                                    ]}
                                >
                                    {gridBody}
                                </View>
                            );
                        }

                        return (
                            <ScrollView
                                key={category.id}
                                ref={(ref) => {
                                    if (ref) {
                                        categoryScrollViewRefs.current[category.id] = ref;
                                    }
                                }}
                                nestedScrollEnabled
                                onScroll={() => {}}
                                scrollEventThrottle={16}
                                contentContainerStyle={styles.scrollContent}
                                style={styles.categoryPage}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                        tintColor={theme.colors.primary}
                                        colors={[theme.colors.primary]}
                                    />
                                }
                            >
                                {gridBody}
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
                                        placeholder="例: 本、映画、音楽、植物"
                                        placeholderTextColor={theme.colors.inactive}
                                        autoFocus={true}
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
                                    onPress={resetEditForm}
                                >
                                    <Text style={[styles.cancelButtonText, { color: theme.colors.secondaryText }]}>
                                        キャンセル
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                                    onPress={handleUpdateCategory}
                                    disabled={updatingCategory}
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

            {/* カテゴリー更新成功モーダル（記録投稿完了と同様のコンパクト表示） */}
            <Modal
                visible={showCategorySuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCategorySuccessModal(false)}
            >
                <TouchableOpacity
                    style={[styles.categorySuccessOverlay, { paddingTop: insets.top + 12 }]}
                    activeOpacity={1}
                    onPress={() => setShowCategorySuccessModal(false)}
                >
                    <View style={[styles.categorySuccessModalContent, { backgroundColor: theme.colors.card }]}>
                        <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary} style={styles.categorySuccessIcon} />
                        <Text style={[styles.categorySuccessMessage, { color: theme.colors.text }]}>
                            カテゴリーを更新しました
                        </Text>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* カテゴリー更新エラーモーダル */}
            <Modal
                visible={showCategoryErrorModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCategoryErrorModal(false)}
            >
                <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.categoryModalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowCategoryErrorModal(false)}
                    >
                        <View style={[styles.categoryErrorModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.categoryErrorIconContainer, { backgroundColor: '#FF3B30' + '20' }]}>
                                <Ionicons name="close-circle" size={48} color="#FF3B30" />
                            </View>
                            <Text style={[styles.categoryErrorTitle, { color: theme.colors.text }]}>
                                エラー
                            </Text>
                            <Text style={[styles.categoryErrorMessage, { color: theme.colors.secondaryText }]}>
                                {categoryErrorMessage}
                            </Text>
                            <TouchableOpacity
                                style={[styles.categoryErrorButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => setShowCategoryErrorModal(false)}
                            >
                                <Text style={styles.categoryErrorButtonText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </BlurView>
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
        fontFamily: 'Nunito_900Black', // 丸み・最太のフォント
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
        alignItems: 'flex-start',
        flex: 1,
    },
    createButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        height: 80,
        alignSelf: 'flex-start',
    },
    iconItem: {
        alignItems: 'center',
        marginRight: 16,
    },
    userIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    userAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    userAvatarPlaceholder: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
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
    userBio: {
        fontSize: 11,
        marginTop: 4,
        lineHeight: 15,
    },
    mainContent: {
        flex: 1,
        position: 'relative',
    },
    adBannerBelowTabs: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    categoryTabsContainer: {
        paddingVertical: 6,
    },
    categoryTabsContent: {
        paddingHorizontal: 14,
        alignItems: 'center',
        paddingVertical: 2,
    },
    categoryTab: {
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 32,
    },
    categoryTabIcon: {
        minWidth: 42,
    },
    categoryTabSelected: {},
    categoryTabGlass: {
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.45)',
    },
    categoryTabGlassSelected: {
        borderWidth: 2.0,
        borderColor: '#4E5F5C',
    },
    categoryTabGlassContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 11,
        paddingVertical: 6,
    },
    categoryTabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    categoryTabText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    horizontalScrollView: {
        flex: 1,
    },
    /** カレンダーモード: 縦方向に子ページが親と同じ高さになるよう伸ばす（CalendarList と親 ScrollView のネストを避ける） */
    horizontalPagerContentCalendar: {
        flexGrow: 1,
        alignItems: 'stretch',
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
    gridContainerCalendar: {
        flex: 1,
        height: '100%',
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
    // タイル表示用スタイル（隙間あり・正方形・3列）
    tileRowContainer: {
        flexDirection: 'row',
        paddingHorizontal: TILE_PADDING,
        marginBottom: TILE_GAP,
        gap: TILE_GAP,
    },
    tileCard: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    tileImageContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
    },
    tileImage: {
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
    categoryModalOverlay: {
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
    categorySuccessOverlay: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    categorySuccessModalContent: {
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
    categorySuccessIcon: {
        marginRight: 10,
    },
    categorySuccessMessage: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        flexShrink: 0,
    },
    categoryErrorModalContent: {
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
    categoryErrorIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    categoryErrorTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    categoryErrorMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    categoryErrorButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 20,
        minWidth: 120,
    },
    categoryErrorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
