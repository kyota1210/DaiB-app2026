import React, { useState, useCallback, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getFriends, getFollowing, getFollowers } from '../api/user';
import { follow } from '../api/follows';
import { getImageUrl } from '../utils/imageHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_KEYS = ['friends', 'following', 'followers'];

const FriendHubScreen = ({ navigation }) => {
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const scrollRef = useRef(null);
    const [activeTab, setActiveTab] = useState(0);
    const [data, setData] = useState({ friends: [], following: [], followers: [] });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const fetchAll = useCallback(async () => {
        if (!userToken) return;
        try {
            const [friendsRes, followingRes, followersRes] = await Promise.all([
                getFriends(userToken),
                getFollowing(userToken),
                getFollowers(userToken),
            ]);
            setData({
                friends: friendsRes.users || [],
                following: followingRes.users || [],
                followers: followersRes.users || [],
            });
        } catch (err) {
            console.error('friend hub fetch error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userToken]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchAll();
        }, [fetchAll])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll();
    };

    const handleTabPress = (index) => {
        setActiveTab(index);
        scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    };

    const onScrollEnd = (e) => {
        const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (page !== activeTab) setActiveTab(page);
    };

    const handleApprove = async (userId, userName) => {
        if (busyId !== null) return;
        setBusyId(userId);
        try {
            await follow(userToken, userId);
            setData((prev) => ({
                ...prev,
                followers: prev.followers.filter((u) => u.id !== userId),
            }));
            const displayName = (userName || '').trim() || t('thisUser');
            Alert.alert('', t('friendRequestApprovedWithName').replace('{{name}}', displayName));
            fetchAll();
        } catch (err) {
            console.error('approve error', err);
        } finally {
            setBusyId(null);
        }
    };

    const openUserProfile = (userId) => {
        navigation.navigate('UserProfile', { userId });
    };

    const tabLabels = [
        t('friends'),
        t('tabRequestsSent'),
        t('tabRequestsReceived'),
    ];
    const tabCounts = [data.friends.length, data.following.length, data.followers.length];

    const renderTab = (label, count, index) => {
        const isActive = activeTab === index;
        return (
            <TouchableOpacity
                key={index}
                style={[styles.tab, isActive && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
                onPress={() => handleTabPress(index)}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.tabLabel,
                    { color: isActive ? theme.colors.text : theme.colors.secondaryText },
                    isActive && styles.tabLabelActive,
                ]}>
                    {label}
                </Text>
                <View style={[styles.tabBadge, { backgroundColor: isActive ? theme.colors.primary : theme.colors.secondaryBackground }]}>
                    <Text style={[styles.tabBadgeText, { color: isActive ? '#fff' : theme.colors.secondaryText }]}>
                        {count}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderUserRow = (item, tabKey) => {
        const avatarUrl = getImageUrl(item.avatar_url);
        const isBusy = busyId === item.id;
        const showApproveButton = tabKey === 'followers';

        return (
            <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity
                    style={styles.rowLeft}
                    onPress={() => openUserProfile(item.id)}
                    activeOpacity={0.7}
                >
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.border }]}>
                            <Ionicons name="person" size={24} color={theme.colors.inactive} />
                        </View>
                    )}
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.user_name || ''}</Text>
                        {item.bio ? <Text style={[styles.bio, { color: theme.colors.secondaryText }]} numberOfLines={2}>{item.bio}</Text> : null}
                    </View>
                </TouchableOpacity>
                {showApproveButton && (
                    <TouchableOpacity
                        style={[styles.approveButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleApprove(item.id, item.user_name)}
                        disabled={isBusy}
                    >
                        {isBusy
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.approveButtonText}>{t('approveFriendRequest')}</Text>}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderPage = (tabKey, index) => {
        const list = data[tabKey] || [];
        return (
            <View key={tabKey} style={{ width: SCREEN_WIDTH }}>
                <FlatList
                    data={list}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => renderUserRow(item, tabKey)}
                    contentContainerStyle={list.length === 0 ? styles.emptyList : undefined}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>{t('noUsers')}</Text>
                        </View>
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('friendsList')} onBack={() => navigation.goBack()} />
            <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
                {tabLabels.map((label, i) => renderTab(label, tabCounts[i], i))}
            </View>
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onScrollEnd}
                    scrollEventThrottle={16}
                >
                    {TAB_KEYS.map((key, i) => renderPage(key, i))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabLabel: {
        fontSize: 14,
    },
    tabLabelActive: {
        fontWeight: '600',
    },
    tabBadge: {
        minWidth: 22,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    tabBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyList: { flex: 1 },
    emptyState: { padding: 24, alignItems: 'center' },
    emptyText: { fontSize: 14 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '600' },
    bio: { fontSize: 12, marginTop: 2 },
    approveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    approveButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default FriendHubScreen;
