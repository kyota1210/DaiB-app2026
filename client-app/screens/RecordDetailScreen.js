import React, { useState, useCallback, useRef, useMemo, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions, Animated, Easing, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ResultModal from '../components/ResultModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecordsApi } from '../api/records';
import { addReaction, getReactionDetails } from '../api/reactions';
import { useRecordsAndCategories } from '../context/RecordsAndCategoriesContext';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getImageUrl } from '../utils/imageHelper';
import { useFocusEffect } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const REACTION_EMOJIS = ['❤️', '👍', '🌸', '🎉', '✨'];

const AnimatedReactionBar = React.memo(({ emojis, onSelect, isClosing, onCloseComplete }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, []);
    useEffect(() => {
        if (isClosing) {
            Animated.timing(anim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
                easing: Easing.in(Easing.cubic),
            }).start(() => onCloseComplete?.());
        }
    }, [isClosing]);
    return (
        <Animated.View
            style={[
                styles.imageReactionBar,
                {
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    borderColor: 'rgba(255,255,255,0.45)',
                    opacity: anim,
                    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
                },
            ]}
            pointerEvents={isClosing ? 'none' : 'auto'}
        >
            {emojis.map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.imageReactionOption} onPress={() => onSelect(emoji)}>
                    <Text style={styles.reactionPopupEmoji}>{emoji}</Text>
                </TouchableOpacity>
            ))}
        </Animated.View>
    );
});

const RecordItem = React.memo(function RecordItem({ item, theme, t, showReactionControl, isReactionBarExpanded, onToggleReactionBar, onSelectReaction, burstEmoji, burstAnim, isReactionBarClosing, onReactionBarCloseComplete, reactionUsers, onPressReactionUser }) {
    const [originalAspect, setOriginalAspect] = useState(null);
    const imageUrl = getImageUrl(item.image_url);
    const date = useMemo(() => new Date(item.date_logged), [item.date_logged]);
    const dateString = useMemo(
        () => date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
        [date]
    );
    const showImage = !!imageUrl;

    useEffect(() => {
        if (imageUrl) {
            Image.getSize(
                imageUrl,
                (w, h) => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setOriginalAspect(w / h);
                },
                () => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setOriginalAspect(1);
                }
            );
        } else {
            setOriginalAspect(null);
        }
    }, [imageUrl]);

    const containerHeight = originalAspect != null ? SCREEN_WIDTH / originalAspect : SCREEN_WIDTH;

    return (
        <ScrollView 
            style={styles.recordItem}
            contentContainerStyle={styles.recordItemContent}
            showsVerticalScrollIndicator={true}
            removeClippedSubviews={true}
        >
            {showImage ? (
                <View style={{ position: 'relative' }}>
                    <TouchableOpacity
                        activeOpacity={0.98}
                    >
                        <View style={[styles.imageContainer, { width: SCREEN_WIDTH, height: containerHeight }]}>
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>
                    </TouchableOpacity>
                    {showReactionControl ? (
                        <TouchableOpacity
                            style={[styles.imageReactionButton, { backgroundColor: theme.colors.card }]}
                            onPress={onToggleReactionBar}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="happy-outline" size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                    ) : null}
                    {showReactionControl && isReactionBarExpanded ? (
                        <AnimatedReactionBar
                            emojis={REACTION_EMOJIS}
                            onSelect={onSelectReaction}
                            isClosing={isReactionBarClosing}
                            onCloseComplete={onReactionBarCloseComplete}
                        />
                    ) : null}
                    {burstEmoji ? (
                        <Animated.View style={styles.burstOverlay} pointerEvents="none">
                            <Animated.Text style={[
                                styles.burstEmoji,
                                {
                                    opacity: burstAnim.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0] }),
                                    transform: [{ scale: burstAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1.5, 2.5] }) }],
                                },
                            ]}>
                                {burstEmoji}
                            </Animated.Text>
                        </Animated.View>
                    ) : null}
                </View>
            ) : (
                <View style={[styles.placeholderImageContainer, { backgroundColor: theme.colors.border }]}>
                    <Ionicons name="image-outline" size={80} color={theme.colors.inactive} />
                    <Text style={[styles.placeholderText, { color: theme.colors.inactive }]}>
                        {t('noImage')}
                    </Text>
                </View>
            )}

            <View style={styles.infoContainer}>
                <Text style={[styles.date, { color: theme.colors.secondaryText }]}>{dateString}</Text>
                {item.title && (
                    <Text 
                        style={[styles.title, { color: theme.colors.text }]}
                    >
                        {item.title}
                    </Text>
                )}
                {item.description && (
                    <Text style={[styles.description, { color: theme.colors.secondaryText }]}>
                        {item.description}
                    </Text>
                )}
            </View>

            {reactionUsers?.length > 0 ? (
                <View style={styles.reactionUsersSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionUsersRow}>
                        {reactionUsers.map((r, i) => (
                            <TouchableOpacity
                                key={`${r.user_id}-${i}`}
                                style={styles.reactionUserItem}
                                activeOpacity={0.75}
                                onPress={() => onPressReactionUser?.(r)}
                            >
                                {r.avatar_url ? (
                                    <Image source={{ uri: getImageUrl(r.avatar_url) }} style={[styles.reactionUserAvatar, { borderColor: theme.colors.border }]} />
                                ) : (
                                    <View style={[styles.reactionUserAvatar, styles.reactionUserAvatarPlaceholder, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                                        <Ionicons name="person" size={27} color={theme.colors.inactive} />
                                    </View>
                                )}
                                <View style={styles.reactionUserBadge}>
                                    <Text
                                        style={[
                                            styles.reactionUserBadgeEmoji,
                                            Platform.OS === 'android' && { includeFontPadding: false },
                                        ]}
                                    >
                                        {r.emoji}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </ScrollView>
    );
});

export default function RecordDetailScreen({ route, navigation }) {
    const { records: paramsRecords, initialIndex } = route.params;
    const { records: contextRecords } = useRecordsAndCategories();
    // タイムラインから開いた場合（author_id あり）は params をそのまま使用
    const paramsHaveAuthorInfo = paramsRecords?.some?.((r) => r.author_id != null);
    // 一覧の並び順（paramsRecords）を維持しつつ、Context の最新データで各レコードを更新
    const records = useMemo(() => {
        if (paramsHaveAuthorInfo && paramsRecords?.length > 0) return paramsRecords;
        if (!paramsRecords?.length) return contextRecords || [];
        return (paramsRecords || []).map((pr) => {
            const updated = contextRecords?.find((cr) => cr.id === pr.id);
            return updated ? { ...updated } : pr;
        });
    }, [paramsRecords, contextRecords, paramsHaveAuthorInfo]);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [scrollAreaHeight, setScrollAreaHeight] = useState(SCREEN_HEIGHT);
    const scrollViewRef = useRef(null);
    const menuButtonRef = useRef(null);
    const { deleteRecord } = useRecordsApi();
    const { loadRecords } = useRecordsAndCategories();
    const { userToken, userInfo } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();

    const [myReaction, setMyReaction] = useState(() => paramsRecords?.[initialIndex]?.my_reaction ?? null);
    const [reactionData, setReactionData] = useState({ recordId: null, users: [] });
    const [selectedReactionUser, setSelectedReactionUser] = useState(null);
    const [isReactionBarExpanded, setIsReactionBarExpanded] = useState(false);
    const [isReactionBarClosing, setIsReactionBarClosing] = useState(false);
    const [burstEmoji, setBurstEmoji] = useState(null);
    const burstAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    // 表示中のレコードIDを追跡し、Context 更新後も同じレコードを指すようにする
    const currentRecordIdRef = useRef(records[initialIndex]?.id);
    const currentRecord = records[currentIndex];
    if (currentRecord?.id) currentRecordIdRef.current = currentRecord.id;

    // 表示中の投稿がログインユーザー自身のものか（他人の投稿なら false）
    const isOwnPost = !currentRecord?.author_id || currentRecord.author_id === userInfo?.id;
    // タイムラインから他人の投稿を開いた場合のみ true（ヘッダーに著者表示・横スワイプ無効）
    const isTimelineOtherUser = !!(paramsHaveAuthorInfo && currentRecord && !isOwnPost);

    useEffect(() => {
        if (isTimelineOtherUser && currentRecord) {
            setMyReaction(currentRecord.my_reaction ?? null);
        }
    }, [currentRecord?.id]);

    useEffect(() => {
        if (!isOwnPost || !currentRecord?.id || !userToken) return;
        const fetchingId = currentRecord.id;
        let cancelled = false;
        getReactionDetails(userToken, fetchingId)
            .then((res) => {
                if (!cancelled) setReactionData({ recordId: fetchingId, users: res.details || [] });
            })
            .catch(() => {
                if (!cancelled) setReactionData({ recordId: fetchingId, users: [] });
            });
        return () => { cancelled = true; };
    }, [currentRecord?.id, isOwnPost, userToken]);

    // レンダー時点で現在のレコードに対応するデータのみ使う（IDが一致しなければ空）
    const reactionUsers = reactionData.recordId === currentRecord?.id ? reactionData.users : [];

    const handlePressReactionUser = useCallback((user) => {
        setSelectedReactionUser(user);
    }, []);

    const applyReaction = useCallback(async (emoji) => {
        if (!userToken || !currentRecord) return;
        const prev = myReaction;
        setMyReaction(emoji);
        setIsReactionBarExpanded(false);
        setIsReactionBarClosing(false);
        setBurstEmoji(emoji);
        burstAnim.setValue(0);
        Animated.sequence([
            Animated.spring(burstAnim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 }),
            Animated.timing(burstAnim, { toValue: 2, duration: 350, useNativeDriver: true }),
        ]).start(() => setBurstEmoji(null));
        try {
            await addReaction(userToken, currentRecord.id, emoji);
        } catch (err) {
            console.error('Reaction apply error', err);
            setMyReaction(prev);
        }
    }, [userToken, currentRecord, myReaction, burstAnim]);

    const toggleReactionBar = useCallback(() => {
        if (!isTimelineOtherUser) return;
        if (isReactionBarExpanded) {
            setIsReactionBarClosing(true);
        } else {
            setIsReactionBarClosing(false);
            setIsReactionBarExpanded(true);
        }
    }, [isTimelineOtherUser, isReactionBarExpanded]);

    const handleReactionBarCloseComplete = useCallback(() => {
        setIsReactionBarExpanded(false);
        setIsReactionBarClosing(false);
    }, []);

    useEffect(() => {
        const id = currentRecordIdRef.current;
        if (!id || !records?.length) return;
        const idx = records.findIndex((r) => r.id === id);
        if (idx >= 0 && idx !== currentIndex) {
            setCurrentIndex(idx);
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * idx, animated: false });
            }, 0);
        }
    }, [records]);

    // 横スクロール終了時に現在のインデックスを更新
    const handleMomentumScrollEnd = (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        if (index >= 0 && index < records.length) {
            setCurrentIndex(index);
        }
    };

    // 初期表示時に正しい位置にスクロール
    React.useEffect(() => {
        if (scrollViewRef.current && initialIndex > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    x: SCREEN_WIDTH * initialIndex,
                    animated: false,
                });
            }, 100);
        }
    }, [initialIndex]);

    const handleDelete = () => {
        setShowMenu(false);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        setShowDeleteConfirmModal(false);
        try {
            await deleteRecord(currentRecord.id);
            await loadRecords(); // キャッシュを更新
            navigation.goBack();
        } catch (error) {
            setErrorMessage(error.message || t('deleteFailed'));
            setShowErrorModal(true);
        }
    };

    const handleEdit = () => {
        setShowMenu(false);
        navigation.navigate('PhotoPicker', { record: currentRecord });
    };

    const handleMenuPress = () => {
        if (menuButtonRef.current) {
            menuButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                setMenuPosition({ x: pageX, y: pageY, width, height });
                setShowMenu(true);
            });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* ヘッダー（メニューバー） */}
            <View style={[styles.header, { 
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border 
            }]}>
                {!isTimelineOtherUser && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                )}
                {isTimelineOtherUser && currentRecord ? (
                    <TouchableOpacity
                        style={styles.headerAuthorRow}
                        onPress={() => currentRecord.author_id != null && navigation.navigate('UserProfile', { userId: currentRecord.author_id })}
                        activeOpacity={0.7}
                        disabled={currentRecord.author_id == null}
                    >
                        {currentRecord.author_avatar_url ? (
                            <Image source={{ uri: getImageUrl(currentRecord.author_avatar_url) }} style={styles.headerAuthorAvatar} />
                        ) : (
                            <View style={[styles.headerAuthorAvatarPlaceholder, { backgroundColor: theme.colors.border }]}>
                                <Ionicons name="person" size={18} color={theme.colors.inactive} />
                            </View>
                        )}
                        <Text style={[styles.headerAuthorName, { color: theme.colors.text }]} numberOfLines={1}>
                            {currentRecord.author_name || ''}
                        </Text>
                        {myReaction ? <Text style={styles.reactionBadgeEmoji}>{myReaction}</Text> : null}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
                {isTimelineOtherUser ? (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Ionicons name="close" size={26} color={theme.colors.icon} />
                    </TouchableOpacity>
                ) : isOwnPost ? (
                    <TouchableOpacity 
                        ref={menuButtonRef}
                        onPress={handleMenuPress} 
                        style={styles.menuButton}
                    >
                        <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {/* コンテンツ: タイムライン他人投稿時は1件のみ表示（横スワイプ不可）、それ以外は横スワイプ可能 */}
            {isTimelineOtherUser && currentRecord ? (
                <View style={styles.singleRecordWrapper}>
                    <RecordItem
                        item={currentRecord}
                        theme={theme}
                        t={t}
                        showReactionControl
                        isReactionBarExpanded={isReactionBarExpanded}
                        onToggleReactionBar={toggleReactionBar}
                        onSelectReaction={applyReaction}
                        burstEmoji={burstEmoji}
                        burstAnim={burstAnim}
                        isReactionBarClosing={isReactionBarClosing}
                        onReactionBarCloseComplete={handleReactionBarCloseComplete}
                    />
                </View>
            ) : (
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    decelerationRate="fast"
                    style={styles.horizontalScrollView}
                    removeClippedSubviews={true}
                    onLayout={(e) => setScrollAreaHeight(e.nativeEvent.layout.height)}
                >
                    {records.map((record) => (
                        <View key={record.id.toString()} style={[styles.recordWrapper, { height: scrollAreaHeight }]}>
                            <RecordItem
                                item={record}
                                theme={theme}
                                t={t}
                                reactionUsers={record.id === currentRecord?.id ? reactionUsers : undefined}
                                onPressReactionUser={handlePressReactionUser}
                            />
                        </View>
                    ))}
                </ScrollView>
            )}
            {/* リアクションユーザーポップアップ */}
            <Modal
                visible={!!selectedReactionUser}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedReactionUser(null)}
            >
                <TouchableOpacity
                    style={styles.reactionUserPopupOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedReactionUser(null)}
                >
                    <View
                        style={[styles.reactionUserPopup, { backgroundColor: theme.colors.card }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                setSelectedReactionUser(null);
                                navigation.navigate('UserProfile', { userId: selectedReactionUser.user_id });
                            }}
                        >
                            {selectedReactionUser?.avatar_url ? (
                                <Image
                                    source={{ uri: getImageUrl(selectedReactionUser.avatar_url) }}
                                    style={[styles.reactionUserPopupAvatar, { borderColor: theme.colors.border }]}
                                />
                            ) : (
                                <View style={[styles.reactionUserPopupAvatar, styles.reactionUserPopupAvatarPlaceholder, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                                    <Ionicons name="person" size={36} color={theme.colors.inactive} />
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.reactionUserPopupEmoji}>{selectedReactionUser?.emoji}</Text>
                        <Text style={[styles.reactionUserPopupName, { color: theme.colors.text }]} numberOfLines={1}>
                            {selectedReactionUser?.user_name}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* メニューモーダル */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={[
                        styles.menuContainer, 
                        { 
                            backgroundColor: theme.colors.card,
                            position: 'absolute',
                            top: menuPosition.y + menuPosition.height,
                            right: 16,
                        }
                    ]}>
                        <TouchableOpacity 
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={handleEdit}
                        >
                            <Ionicons name="pencil-sharp" size={22} color={theme.colors.primary} />
                            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                                {t('edit')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={handleDelete}
                        >
                            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>
                                {t('delete')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <ResultModal
                type="confirm"
                visible={showDeleteConfirmModal}
                title={t('deleteConfirm')}
                message={t('deleteConfirmMessage')}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
            />

            <ResultModal
                type="error"
                visible={showErrorModal}
                title={t('deleteFailed')}
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    closeButton: {
        padding: 6,
    },
    headerSpacer: {
        flex: 1,
    },
    menuButton: {
        padding: 4,
    },
    headerAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
        minWidth: 0,
        justifyContent: 'flex-start',
    },
    headerAuthorAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    headerAuthorAvatarPlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAuthorName: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        textAlign: 'left',
    },
    singleRecordWrapper: {
        width: SCREEN_WIDTH,
        flex: 1,
    },
    horizontalScrollView: {
        flex: 1,
    },
    recordWrapper: {
        width: SCREEN_WIDTH,
        // height は onLayout で取得した scrollAreaHeight を指定（ヘッダー分を除いた表示高さに合わせ、縦長コンテンツが最後までスクロールできるようにする）
    },
    recordItem: {
        flex: 1,
    },
    recordItemContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    imageContainer: {
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    imageReactionButton: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    image: { 
        width: '100%', 
        height: '100%', 
        resizeMode: 'contain' 
    },
    placeholderImageContainer: {
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: { 
        marginTop: 10 
    },
    infoContainer: { 
        padding: 16,
        paddingTop: 16,
    },
    date: { 
        fontSize: 14, 
        marginBottom: 12 
    },
    description: { 
        fontSize: 16, 
        lineHeight: 24 
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    menuContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        minWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    menuItemText: {
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
    },
    imageReactionBar: {
        position: 'absolute',
        right: 42,
        bottom: 8,
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 3,
    },
    imageReactionOption: { paddingHorizontal: 4, paddingVertical: 2 },
    reactionPopupEmoji: {
        fontSize: 24,
    },
    reactionBadgeEmoji: {
        fontSize: 18,
        marginLeft: 6,
    },
    burstOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    burstEmoji: {
        fontSize: 64,
    },
    reactionUsersSection: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 12,
    },
    reactionUsersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    reactionUserItem: {
        position: 'relative',
        width: 66,
        height: 66,
        overflow: 'visible',
    },
    reactionUserAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1.5,
    },
    reactionUserAvatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionUserBadge: {
        position: 'absolute',
        bottom: 6,
        right: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionUserBadgeEmoji: {
        fontSize: 15,
        lineHeight: 20,
        textAlign: 'center',
    },
    reactionUserPopupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionUserPopup: {
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 28,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        minWidth: 180,
    },
    reactionUserPopupAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        marginBottom: 4,
    },
    reactionUserPopupAvatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionUserPopupEmoji: {
        fontSize: 28,
        marginVertical: 8,
    },
    reactionUserPopupName: {
        fontSize: 16,
        fontWeight: '600',
        maxWidth: 200,
    },
});
