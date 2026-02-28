import React, { useState, useCallback, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getFollowing, getFollowers } from '../api/user';
import { follow, unfollow } from '../api/follows';
import { getImageUrl } from '../utils/imageHelper';

const FollowListScreen = ({ navigation, route }) => {
    const mode = route.params?.mode ?? 'following'; // 'following' | 'followers'
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const fetchList = useCallback(async () => {
        if (!userToken) return;
        try {
            const res = mode === 'following' ? await getFollowing(userToken) : await getFollowers(userToken);
            setUsers(res.users || []);
        } catch (err) {
            console.error('follow list error', err);
            setUsers([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userToken, mode]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchList();
        }, [fetchList])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchList();
    };

    const handleFollow = async (userId, isCurrentlyFollowing) => {
        if (busyId !== null) return;
        setBusyId(userId);
        try {
            if (isCurrentlyFollowing) {
                await unfollow(userToken, userId);
                if (mode === 'following') {
                    setUsers((prev) => prev.filter((u) => u.id !== userId));
                } else {
                    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_following: false } : u)));
                }
            } else {
                await follow(userToken, userId);
                if (mode === 'followers') {
                    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_following: true } : u)));
                }
            }
        } catch (err) {
            console.error('follow/unfollow error', err);
        } finally {
            setBusyId(null);
        }
    };

    const renderUser = ({ item }) => {
        const avatarUrl = getImageUrl(item.avatar_url);
        const isFollowing = mode === 'following' ? true : !!item.is_following;
        const isBusy = busyId === item.id;

        return (
            <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
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
                {mode === 'following' ? (
                    <TouchableOpacity
                        style={[styles.followButton, { backgroundColor: theme.colors.secondaryBackground }]}
                        onPress={() => handleFollow(item.id, true)}
                        disabled={isBusy}
                    >
                        {isBusy ? <ActivityIndicator size="small" color={theme.colors.text} /> : <Text style={[styles.followButtonText, { color: theme.colors.text }]}>{t('unfollow')}</Text>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.followButton, isFollowing ? { backgroundColor: theme.colors.secondaryBackground } : { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleFollow(item.id, isFollowing)}
                        disabled={isBusy}
                    >
                        {isBusy ? (
                            <ActivityIndicator size="small" color={isFollowing ? theme.colors.text : '#fff'} />
                        ) : (
                            <Text style={[styles.followButtonText, { color: isFollowing ? theme.colors.text : '#fff' }]}>{isFollowing ? t('unfollow') : t('follow')}</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const title = mode === 'following' ? t('followingList') : t('followersList');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{title}</Text>
                <View style={styles.backBtn} />
            </View>
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderUser}
                    contentContainerStyle={users.length === 0 ? styles.emptyList : undefined}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>{t('noUsers')}</Text>
                        </View>
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: { padding: 8, minWidth: 40 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyList: { flex: 1 },
    emptyState: { padding: 24, alignItems: 'center' },
    emptyText: { fontSize: 14 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '600' },
    bio: { fontSize: 12, marginTop: 2 },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    followButtonText: { fontSize: 14, fontWeight: '600' },
});

export default FollowListScreen;
