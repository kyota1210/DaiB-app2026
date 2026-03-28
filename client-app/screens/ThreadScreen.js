import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Dimensions,
    Animated,
    Easing,
    Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserProfile, getOtherUserProfile } from '../api/user';
import { getTimeline } from '../api/threads';
import { follow } from '../api/follows';
import { addReaction } from '../api/reactions';
import { getImageUrl } from '../utils/imageHelper';
import { SERVER_URL } from '../config';

const REACTION_EMOJIS = ['❤️', '👍', '🌸', '🎉', '✨'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = Math.min(SCREEN_WIDTH - 80, 240);

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

const ThreadScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { userToken, userInfo } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [permission, requestPermission] = useCameraPermissions();
    const [counts, setCounts] = useState({ friend_count: 0 });
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrMode, setQrMode] = useState('display');
    const [scannedUser, setScannedUser] = useState(null);
    const [scanBusy, setScanBusy] = useState(false);
    const [scanNoUserFound, setScanNoUserFound] = useState(false);
    const [expandedReactionRecordId, setExpandedReactionRecordId] = useState(null);
    const [closingReactionRecordId, setClosingReactionRecordId] = useState(null);
    const [burstState, setBurstState] = useState(null);
    const burstAnim = useRef(new Animated.Value(0)).current;
    /** 詳細/プロフィールから戻った次のフォーカスでは再取得しない（スクロール位置維持） */
    const skipRefetchOnNextFocusRef = useRef(false);

    const loadData = useCallback(async () => {
        if (!userToken) return;
        try {
            const clientTz =
                (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Tokyo';
            const [meRes, timelineRes] = await Promise.all([
                getUserProfile(userToken),
                getTimeline(userToken, clientTz),
            ]);
            setCounts({
                friend_count: meRes.user?.friend_count ?? 0,
            });
            const base = timelineRes.records ?? [];
            const mem = timelineRes.memoryResurface;
            if (mem?.record) {
                setRecords([
                    {
                        ...mem.record,
                        memory_kind: mem.kind,
                        memory_years_ago: mem.yearsAgo,
                    },
                    ...base,
                ]);
            } else {
                setRecords(base);
            }
        } catch (err) {
            console.error('ThreadScreen load error', err);
        } finally {
            setLoading(false);
            // プルリフレッシュ時は onRefresh 側で setRefreshing(false) を行うためここでは触らない
        }
    }, [userToken]);

    // フォーカス時: 詳細/プロフィールから戻った場合は再取得せずスクロール位置を維持
    useFocusEffect(
        useCallback(() => {
            if (skipRefetchOnNextFocusRef.current) {
                skipRefetchOnNextFocusRef.current = false;
                return;
            }
            if (records.length === 0) {
                setLoading(true);
            }
            loadData();
        }, [loadData, records.length])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const start = Date.now();
        try {
            await loadData();
        } finally {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 1000 - elapsed);
            if (remaining > 0) {
                await new Promise((r) => setTimeout(r, remaining));
            }
            setRefreshing(false);
        }
    }, [loadData]);

    const handleQrScan = useCallback(
        async (data) => {
            if (scanBusy || !userToken) return;
            const raw = (typeof data === 'string' ? data : String(data || '')).trim();
            if (!raw) return;
            const userId = parseInt(raw, 10);
            if (Number.isNaN(userId) || userId <= 0) return;
            setScanBusy(true);
            setScannedUser(null);
            setScanNoUserFound(false);
            try {
                const res = await getOtherUserProfile(userToken, userId);
                const user = res.user || null;
                setScannedUser(user);
                setScanNoUserFound(!user);
            } catch {
                setScannedUser(null);
                setScanNoUserFound(true);
            } finally {
                setScanBusy(false);
            }
        },
        [userToken, scanBusy]
    );

    const handleFollowScannedUser = useCallback(async () => {
        if (!scannedUser || !userToken || scanBusy) return;
        setScanBusy(true);
        try {
            const res = await follow(userToken, scannedUser.id);
            const nowFriend = !!res?.is_friend;
            setScannedUser((prev) => (prev ? { ...prev, is_following: true, is_friend: nowFriend } : null));
        } catch (e) {
            console.error(e);
        } finally {
            setScanBusy(false);
        }
    }, [scannedUser, userToken, scanBusy]);

    const openRecordDetail = (index) => {
        if (records.length === 0) return;
        skipRefetchOnNextFocusRef.current = true;
        navigation.navigate('RecordDetail', {
            records,
            initialIndex: index,
        });
    };

    const applyReaction = useCallback(async (recordId, emoji) => {
        if (!userToken) return;
        const prevReaction = records.find((r) => r.id === recordId)?.my_reaction ?? null;
        setRecords((prev) =>
            prev.map((r) => (r.id === recordId ? { ...r, my_reaction: emoji } : r))
        );
        setExpandedReactionRecordId(null);
        setClosingReactionRecordId(null);
        setBurstState({ recordId, emoji });
        burstAnim.setValue(0);
        Animated.sequence([
            Animated.spring(burstAnim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 }),
            Animated.timing(burstAnim, { toValue: 2, duration: 350, useNativeDriver: true }),
        ]).start(() => setBurstState(null));
        try {
            await addReaction(userToken, recordId, emoji);
        } catch (err) {
            console.error('Reaction apply error', err);
            setRecords((prev) =>
                prev.map((r) => (r.id === recordId ? { ...r, my_reaction: prevReaction } : r))
            );
        }
    }, [userToken, records, burstAnim]);

    const handleReactionButtonPress = useCallback((item) => {
        if (!item?.id) return;
        if (item.author_id == null || item.author_id === userInfo?.id) return;
        if (expandedReactionRecordId === item.id) {
            setClosingReactionRecordId(item.id);
        } else {
            setClosingReactionRecordId(null);
            setExpandedReactionRecordId(item.id);
        }
    }, [userInfo?.id, expandedReactionRecordId]);

    const handleReactionBarCloseComplete = useCallback(() => {
        setExpandedReactionRecordId(null);
        setClosingReactionRecordId(null);
    }, []);

    const renderItem = ({ item, index }) => {
        const imageUrl = getImageUrl(item.image_url);
        const authorAvatarUrl = getImageUrl(item.author_avatar_url);
        const dateStr = item.date_logged
            ? new Date(item.date_logged).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';

        const openUserProfile = () => {
            if (item.author_id != null) {
                skipRefetchOnNextFocusRef.current = true;
                navigation.navigate('UserProfile', { userId: item.author_id });
            }
        };

        const isMemoryResurface = !!item.is_memory_resurface;
        const memoryLabelText =
            isMemoryResurface &&
            (item.memory_kind === 'anniversary' && item.memory_years_ago != null
                ? t('memoryResurfaceYearsAgoToday').replace('{{years}}', String(item.memory_years_ago))
                : t('memoryResurfaceSerendipity'));

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => openRecordDetail(index)}
                activeOpacity={0.9}
            >
                {isMemoryResurface && memoryLabelText ? (
                    <View style={[styles.memoryLabelRow, { backgroundColor: theme.colors.secondaryBackground }]}>
                        <Ionicons name="time-outline" size={14} color={theme.colors.primary} style={styles.memoryLabelIcon} />
                        <Text style={[styles.memoryLabelText, { color: theme.colors.primary }]} numberOfLines={1}>
                            {memoryLabelText}
                        </Text>
                    </View>
                ) : null}
                {isMemoryResurface ? (
                    <View style={styles.cardHeader}>
                        {authorAvatarUrl ? (
                            <Image source={{ uri: authorAvatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.border }]}>
                                <Ionicons name="person" size={20} color={theme.colors.inactive} />
                            </View>
                        )}
                        <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
                            {item.author_name || ''}
                        </Text>
                        {item.my_reaction ? <Text style={styles.reactionBadgeEmoji}>{item.my_reaction}</Text> : null}
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.cardHeader}
                        onPress={openUserProfile}
                        activeOpacity={0.8}
                        disabled={item.author_id == null}
                    >
                        {authorAvatarUrl ? (
                            <Image source={{ uri: authorAvatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.border }]}>
                                <Ionicons name="person" size={20} color={theme.colors.inactive} />
                            </View>
                        )}
                        <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
                            {item.author_name || ''}
                        </Text>
                        {item.my_reaction ? <Text style={styles.reactionBadgeEmoji}>{item.my_reaction}</Text> : null}
                    </TouchableOpacity>
                )}
                {imageUrl ? (
                    <View style={styles.imageArea}>
                        <TouchableOpacity
                            activeOpacity={0.95}
                            onPress={() => openRecordDetail(index)}
                        >
                            <Image source={{ uri: imageUrl }} style={styles.recordImage} resizeMode="cover" />
                        </TouchableOpacity>
                        {item.author_id != null && item.author_id !== userInfo?.id ? (
                            <TouchableOpacity
                                style={[styles.imageReactionButton, { backgroundColor: theme.colors.card }]}
                                onPress={() => handleReactionButtonPress(item)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="happy-outline" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                        ) : null}
                        {expandedReactionRecordId === item.id ? (
                            <AnimatedReactionBar
                                emojis={REACTION_EMOJIS}
                                onSelect={(emoji) => applyReaction(item.id, emoji)}
                                isClosing={closingReactionRecordId === item.id}
                                onCloseComplete={handleReactionBarCloseComplete}
                            />
                        ) : null}
                    </View>
                ) : (
                    <View style={[styles.recordImagePlaceholder, { backgroundColor: theme.colors.secondaryBackground }]}>
                        <Ionicons name="image-outline" size={40} color={theme.colors.inactive} />
                    </View>
                )}
                <View style={styles.cardFooter}>
                    {dateStr ? <Text style={[styles.dateText, { color: theme.colors.secondaryText }]}>{dateStr}</Text> : null}
                    {item.title ? <Text style={[styles.titleText, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text> : null}
                </View>
                {burstState?.recordId === item.id ? (
                    <Animated.View style={styles.burstOverlay} pointerEvents="none">
                        <Animated.Text style={[
                            styles.burstEmoji,
                            {
                                opacity: burstAnim.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0] }),
                                transform: [{ scale: burstAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1.5, 2.5] }) }],
                            },
                        ]}>
                            {burstState.emoji}
                        </Animated.Text>
                    </Animated.View>
                ) : null}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.topBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                <View style={styles.countsRow}>
                    <TouchableOpacity
                        style={styles.countChip}
                        onPress={() => navigation.navigate('FriendHub')}
                    >
                        <Text style={[styles.countNumber, { color: theme.colors.text }]}>{counts.friend_count}</Text>
                        <Text style={[styles.countLabel, { color: theme.colors.secondaryText }]}>{t('friends')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerSpacer} />
                <TouchableOpacity style={styles.searchButton} onPress={() => setShowQrModal(true)}>
                    <Ionicons name="qr-code-outline" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
            </View>

            {/* QR モーダル: 自分のQR表示 / QR読み取り */}
            <Modal
                visible={showQrModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowQrModal(false)}
            >
                <SafeAreaView style={[styles.qrModalSafeArea, { backgroundColor: 'rgba(0,0,0,0.9)' }]} edges={[]}>
                    <View style={[styles.qrModalOverlay, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
                        {/* ×ボタン: セーフエリア下の左上に配置（タップ可能に） */}
                        <TouchableOpacity
                            style={[styles.qrModalCloseFixed, { top: insets.top + 12, left: Math.max(insets.left, 8) + 8 }]}
                            onPress={() => { setShowQrModal(false); setQrMode('display'); setScannedUser(null); setScanNoUserFound(false); }}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <View
                            style={[
                                styles.qrModalContent,
                                { backgroundColor: theme.colors.background },
                                qrMode === 'display' && styles.qrModalContentFlex,
                                qrMode === 'scan' && (scannedUser || scanNoUserFound) && styles.qrModalContentNarrow,
                            ]}
                        >
                            {qrMode === 'display' ? (
                                <>
                                    <View style={styles.qrModalCenter}>
                                        <Text style={[styles.qrModalTitle, { color: theme.colors.text }]}>
                                            {t('showMyQr')}
                                        </Text>
                                        {userInfo?.id ? (
                                            <View style={[styles.qrCodeWrap, { backgroundColor: '#fff', padding: 16, borderRadius: 12, width: QR_SIZE + 32, height: QR_SIZE + 32, justifyContent: 'center' }]}>
                                                <QRCode
                                                    value={String(userInfo.id)}
                                                    size={QR_SIZE}
                                                    color="#000"
                                                    backgroundColor="#fff"
                                                    logo={require('../assets/icon.png')}
                                                    logoSize={QR_SIZE * 0.22}
                                                    logoBackgroundColor="#fff"
                                                    logoMargin={2}
                                                    ecl="H"
                                                />
                                            </View>
                                        ) : (
                                            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.qrLoader} />
                                        )}
                                        <TouchableOpacity
                                            style={[styles.qrActionButton, styles.qrActionButtonCompact, { backgroundColor: theme.colors.primary }]}
                                            onPress={() => { setQrMode('scan'); setScannedUser(null); setScanNoUserFound(false); }}
                                        >
                                            <Text style={styles.qrActionButtonText}>{t('scanQr')}</Text>
                                        </TouchableOpacity>
                                        {userInfo?.id ? (
                                            <TouchableOpacity
                                                style={[styles.qrShareButton, { borderColor: theme.colors.border }]}
                                                onPress={async () => {
                                                    try {
                                                        const url = `${SERVER_URL}/invite/${userInfo.id}`;
                                                        await Share.share({ message: `${t('inviteLinkMessage')}\n${url}` });
                                                    } catch {}
                                                }}
                                            >
                                                <Ionicons name="share-outline" size={18} color={theme.colors.text} style={{ marginRight: 6 }} />
                                                <Text style={[styles.qrShareButtonText, { color: theme.colors.text }]}>{t('shareInviteLink')}</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </>
                            ) : (
                                <>
                                    {!permission?.granted ? (
                                        <View style={styles.qrCameraPlaceholder}>
                                            <View style={[styles.qrCameraPlaceholderIconWrap, { backgroundColor: theme.colors.secondaryBackground }]}>
                                                <Ionicons name="camera-outline" size={48} color={theme.colors.inactive} />
                                            </View>
                                            <Text style={[styles.qrCameraPlaceholderHint, { color: theme.colors.secondaryText }]}>{t('scanQrToFollow')}</Text>
                                            <TouchableOpacity
                                                style={[styles.qrCameraPermissionButton, { backgroundColor: theme.colors.primary }]}
                                                onPress={async () => { await requestPermission(); }}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.qrActionButtonText}>{t('cameraPermissionButton')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : scannedUser ? (
                                        <View style={[styles.scannedUserCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                            {scannedUser.avatar_url ? (
                                                <Image source={{ uri: getImageUrl(scannedUser.avatar_url) }} style={styles.scannedUserAvatar} />
                                            ) : (
                                                <View style={[styles.avatarPlaceholder, styles.scannedUserAvatar, { backgroundColor: theme.colors.border }]}>
                                                    <Ionicons name="person" size={32} color={theme.colors.inactive} />
                                                </View>
                                            )}
                                            <Text style={[styles.scannedUserName, { color: theme.colors.text }]}>{scannedUser.user_name || ''}</Text>
                                            {scannedUser.is_following ? (
                                                <Text style={[styles.qrFollowedMessage, { color: theme.colors.secondaryText }]}>
                                                    {scannedUser.is_friend ? t('friendRequestApproved') : t('friendRequestSent')}
                                                </Text>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[styles.qrFollowButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.border }]}
                                                    onPress={handleFollowScannedUser}
                                                    disabled={scanBusy}
                                                    activeOpacity={0.8}
                                                >
                                                    {scanBusy ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <Text style={[styles.qrFollowButtonText, { color: '#fff' }]}>{t('sendFriendRequest')}</Text>
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ) : scanNoUserFound ? (
                                        <View style={[styles.qrNoUserWrap, { backgroundColor: theme.colors.secondaryBackground }]}>
                                            <Text style={[styles.qrNoUserText, { color: theme.colors.text }]}>{t('userNotFoundByQr')}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.qrCameraWrap}>
                                            <CameraView
                                                style={styles.qrCameraView}
                                                facing="back"
                                                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                                onBarcodeScanned={scanBusy ? undefined : ({ data }) => handleQrScan(data)}
                                            />
                                            <Text style={[styles.qrScanHint, { color: theme.colors.secondaryText }]}>{t('scanQrToFollow')}</Text>
                                        </View>
                                    )}
                                    <View style={styles.qrBackButtonWrap}>
                                        {scanNoUserFound && (
                                            <TouchableOpacity
                                                style={[styles.qrRescanButton, styles.qrScanButtonCompact, { backgroundColor: theme.colors.primary }]}
                                                onPress={() => { setScanNoUserFound(false); }}
                                            >
                                                <Text style={styles.qrRescanButtonText}>{t('rescanQr')}</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.qrBackButton, styles.qrScanButtonCompact, { borderColor: theme.colors.border }]}
                                            onPress={() => { setQrMode('display'); setScannedUser(null); setScanNoUserFound(false); }}
                                        >
                                            <Text style={[styles.qrBackButtonText, { color: theme.colors.text }]}>{t('backToQrDisplay')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => (item.is_memory_resurface ? `mem-${item.id}` : String(item.id))}
                    renderItem={renderItem}
                    contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.inactive} />
                            <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>{t('noTimeline')}</Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                            colors={[theme.colors.primary]}
                        />
                    }
                />
            )}

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    countsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countChip: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
    countNumber: { fontSize: 16, fontWeight: '700' },
    countLabel: { fontSize: 11 },
    headerSpacer: { flex: 1 },
    searchButton: { padding: 8 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 12, paddingBottom: 80 },
    emptyContainer: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
    card: {
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    memoryLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    memoryLabelIcon: { marginRight: 6 },
    memoryLabelText: { fontSize: 12, fontWeight: '700', flex: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    authorName: { marginLeft: 8, fontSize: 14, fontWeight: '600', flex: 1 },
    recordImage: { width: '100%', aspectRatio: 1, backgroundColor: '#111' },
    recordImagePlaceholder: { width: '100%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
    cardFooter: { padding: 10 },
    dateText: { fontSize: 12 },
    titleText: { fontSize: 14, marginTop: 4 },
    imageArea: { position: 'relative' },
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
    qrModalSafeArea: { flex: 1 },
    qrModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    qrModalCloseFixed: { position: 'absolute', zIndex: 10, padding: 12, minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    qrModalContent: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 16, width: '100%', maxWidth: 400 },
    /** QR 読み取り直後のユーザー表示／未検出時はパネルを画面幅いっぱいにしない */
    qrModalContentNarrow: { width: '86%', maxWidth: 340, alignSelf: 'center' },
    qrModalContentFlex: { flex: 1 },
    qrModalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    qrModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    qrLoader: { marginVertical: 40 },
    qrCodeWrap: { alignItems: 'center', marginVertical: 16 },
    qrHint: { textAlign: 'center', marginVertical: 16 },
    qrActionButton: { marginTop: 16, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    qrActionButtonCompact: { width: '80%', maxWidth: 280, alignSelf: 'center' },
    qrActionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    qrShareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1 },
    qrShareButtonText: { fontSize: 14, fontWeight: '500' },
    qrBackButton: { borderWidth: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    qrBackButtonText: { fontSize: 15 },
    qrCameraPlaceholder: {
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 280,
    },
    qrCameraPlaceholderIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    qrCameraPlaceholderHint: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    qrCameraPermissionButton: {
        width: '100%',
        maxWidth: 280,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrCameraWrap: { width: '100%', maxWidth: 320, alignSelf: 'center', height: 320, borderRadius: 12, overflow: 'hidden', position: 'relative', marginTop: 8, backgroundColor: '#000' },
    qrCameraView: { width: '100%', height: '100%' },
    qrScanHint: { position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12 },
    qrNoUserWrap: { paddingVertical: 24, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
    qrNoUserText: { fontSize: 15, textAlign: 'center' },
    qrBackButtonWrap: { marginTop: 16, gap: 12, alignItems: 'center' },
    qrRescanButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    qrScanButtonCompact: { width: '80%', maxWidth: 280, alignSelf: 'center' },
    qrRescanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    scannedUserCard: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginTop: 16 },
    scannedUserAvatar: { width: 64, height: 64, borderRadius: 32 },
    scannedUserName: { marginTop: 12, fontSize: 18, fontWeight: '600' },
    qrFollowedMessage: { marginTop: 20, fontSize: 15 },
    qrFollowButton: {
        marginTop: 20,
        width: '100%',
        minHeight: 48,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    qrFollowButtonText: { fontSize: 16, fontWeight: '600' },
});

export default ThreadScreen;
