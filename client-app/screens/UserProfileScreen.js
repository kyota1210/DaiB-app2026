import React, { useState, useCallback, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    FlatList,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getOtherUserProfile, getOtherUserRecords } from '../api/user';
import { follow, unfollow } from '../api/follows';
import { getImageUrl } from '../utils/imageHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_GAP = 8;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_IMAGE_HEIGHT = CARD_WIDTH;

const UserProfileScreen = ({ navigation, route }) => {
    const userId = route.params?.userId;
    const { userToken, userInfo } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [user, setUser] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);
    /** 投稿詳細から戻った次のフォーカスでは再取得しない（スクロール位置維持） */
    const skipRefetchOnNextFocusRef = useRef(false);

    const isMe = userInfo?.id != null && Number(userId) === Number(userInfo.id);

    const loadProfileAndRecords = useCallback(async () => {
        if (userId == null) return;
        setLoading(true);
        setRecordsLoading(true);
        try {
            await Promise.all([
                getOtherUserProfile(userToken, Number(userId)).then((res) => {
                    setUser(res.user || null);
                }).catch((err) => {
                    console.error('UserProfile fetch error', err);
                    setUser(null);
                }),
                getOtherUserRecords(userToken, Number(userId)).then((res) => {
                    setRecords(res.records ?? []);
                }).catch((err) => {
                    console.error('User records fetch error', err);
                    setRecords([]);
                }),
            ]);
        } finally {
            setLoading(false);
            setRecordsLoading(false);
        }
    }, [userToken, userId]);

    useFocusEffect(
        useCallback(() => {
            if (skipRefetchOnNextFocusRef.current) {
                skipRefetchOnNextFocusRef.current = false;
                return;
            }
            loadProfileAndRecords();
        }, [loadProfileAndRecords])
    );

    const handleAction = async () => {
        if (followBusy || !user) return;
        const name = (user.user_name || '').trim() || t('thisUser');

        if (user.is_friend) {
            const message = t('removeFriendConfirmWithName').replace('{{name}}', name);
            Alert.alert('', message, [
                { text: t('cancel'), style: 'cancel' },
                { text: t('removeFriend'), style: 'destructive', onPress: () => doUnfollow() },
            ]);
            return;
        }

        if (user.is_following) {
            const message = t('cancelFriendRequestConfirmWithName').replace('{{name}}', name);
            Alert.alert('', message, [
                { text: t('cancel'), style: 'cancel' },
                { text: t('cancelFriendRequest'), style: 'destructive', onPress: () => doUnfollow() },
            ]);
            return;
        }

        setFollowBusy(true);
        try {
            const res = await follow(userToken, user.id);
            const nowFriend = !!res?.is_friend;
            setUser((prev) => prev ? { ...prev, is_following: true, is_friend: nowFriend } : null);
            if (nowFriend) {
                Alert.alert('', t('friendRequestApprovedWithName').replace('{{name}}', name));
            }
        } catch (err) {
            console.error('follow error', err);
        } finally {
            setFollowBusy(false);
        }
    };

    const doUnfollow = async () => {
        if (followBusy || !user) return;
        setFollowBusy(true);
        try {
            await unfollow(userToken, user.id);
            setUser((prev) => prev ? { ...prev, is_following: false, is_friend: false } : null);
        } catch (err) {
            console.error('unfollow error', err);
        } finally {
            setFollowBusy(false);
        }
    };

    if (userId == null) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <View style={[styles.topBar, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('profile')}</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.centered}>
                    <Text style={[styles.errorText, { color: theme.colors.secondaryText }]}>{t('userNotFound')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <View style={[styles.topBar, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('profile')}</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <View style={[styles.topBar, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('profile')}</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.centered}>
                    <Text style={[styles.errorText, { color: theme.colors.secondaryText }]}>{t('userNotFound')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const avatarUrl = getImageUrl(user.avatar_url);

    const openRecordDetail = (index) => {
        skipRefetchOnNextFocusRef.current = true;
        const withAuthor = (records || []).map((r) => ({
            ...r,
            author_id: user.id,
            author_name: user.user_name || '',
            author_avatar_url: user.avatar_url || null,
        }));
        navigation.navigate('RecordDetail', { records: withAuthor, initialIndex: index });
    };

    const renderRecordItem = ({ item, index }) => {
        const imageUrl = getImageUrl(item.image_url);
        return (
            <TouchableOpacity
                style={[styles.recordCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => openRecordDetail(index)}
                activeOpacity={0.9}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.recordCardImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.recordCardPlaceholder, { backgroundColor: theme.colors.secondaryBackground }]}>
                        <Ionicons name="image-outline" size={32} color={theme.colors.inactive} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const listHeader = (
        <View style={styles.profileHeaderWrap}>
            <View style={styles.profileBlock}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.border }]}>
                        <Ionicons name="person" size={48} color={theme.colors.inactive} />
                    </View>
                )}
                <Text style={[styles.userName, { color: theme.colors.text }]}>{user.user_name || ''}</Text>
                {user.bio ? <Text style={[styles.bio, { color: theme.colors.secondaryText }]}>{user.bio}</Text> : null}
                {recordsLoading ? <ActivityIndicator size="small" color={theme.colors.primary} style={styles.recordsLoader} /> : null}
            </View>
        </View>
    );

    const listFooter = (
        <View style={styles.followButtonWrap}>
            {isMe ? (
                <TouchableOpacity
                    style={[styles.followButton, { backgroundColor: theme.colors.secondaryBackground }]}
                    onPress={() => navigation.navigate('MyPage')}
                >
                    <Text style={[styles.followButtonText, { color: theme.colors.text }]}>{t('settings')}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[
                        styles.followButton,
                        (user.is_friend || user.is_following)
                            ? { backgroundColor: theme.colors.secondaryBackground }
                            : { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleAction}
                    disabled={followBusy}
                >
                    {followBusy ? (
                        <ActivityIndicator size="small" color={theme.colors.text} />
                    ) : (
                        <Text style={[styles.followButtonText, {
                            color: (user.is_friend || user.is_following) ? theme.colors.text : '#fff',
                        }]}>
                            {user.is_friend
                                ? t('removeFriend')
                                : user.is_following
                                    ? t('cancelFriendRequest')
                                    : user.is_followed_by
                                        ? t('approveFriendRequest')
                                        : t('sendFriendRequest')}
                        </Text>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.topBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>{user.user_name || t('profile')}</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={records}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderRecordItem}
                ListHeaderComponent={listHeader}
                ListFooterComponent={listFooter}
                numColumns={NUM_COLUMNS}
                columnWrapperStyle={styles.recordRow}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !recordsLoading && records.length === 0 ? (
                        <View style={styles.emptyRecords}>
                            <Text style={[styles.emptyRecordsText, { color: theme.colors.secondaryText }]}>{t('noRecords')}</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
    placeholder: { width: 40 },
    listContent: { paddingBottom: 24 },
    profileHeaderWrap: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
    profileBlock: { alignItems: 'center', width: '100%', maxWidth: 360, paddingTop: 24, paddingBottom: 20 },
    avatar: { width: 96, height: 96, borderRadius: 48 },
    avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    userName: { fontSize: 20, fontWeight: '600', marginTop: 12, textAlign: 'center' },
    bio: { fontSize: 14, marginTop: 8, textAlign: 'center', width: '100%' },
    followButtonWrap: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, alignItems: 'center' },
    followButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, minWidth: 140, alignItems: 'center' },
    followButtonText: { fontSize: 16, fontWeight: '600' },
    recordsLoader: { marginTop: 12 },
    recordRow: { paddingHorizontal: CARD_PADDING, marginBottom: CARD_GAP, gap: CARD_GAP },
    recordCard: { width: CARD_WIDTH, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
    recordCardImage: { width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT },
    recordCardPlaceholder: { width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    emptyRecords: { padding: 24, alignItems: 'center' },
    emptyRecordsText: { fontSize: 14 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16 },
});

export default UserProfileScreen;
