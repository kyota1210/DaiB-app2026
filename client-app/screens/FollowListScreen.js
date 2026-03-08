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
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getFollowing, getFollowers } from '../api/user';
import { follow } from '../api/follows';
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

    const handleFollow = async (userId, userName) => {
        if (busyId !== null) return;
        setBusyId(userId);
        try {
            await follow(userToken, userId);
            if (mode === 'followers') {
                setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_following: true } : u)));
                const displayName = (userName || '').trim() || t('thisUser');
                const message = t('followedMessageWithName').replace('{{name}}', displayName);
                Alert.alert('', message);
            }
        } catch (err) {
            console.error('follow error', err);
        } finally {
            setBusyId(null);
        }
    };

    const openUserProfile = (userId) => {
        navigation.navigate('UserProfile', { userId });
    };

    const renderUser = ({ item }) => {
        const avatarUrl = getImageUrl(item.avatar_url);
        const isFollowing = !!item.is_following;
        const isBusy = busyId === item.id;
        const showFollowButton = mode === 'followers' && !isFollowing;

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
                {showFollowButton && (
                    <TouchableOpacity
                        style={[styles.followButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleFollow(item.id, item.user_name)}
                        disabled={isBusy}
                    >
                        {isBusy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.followButtonText, { color: '#fff' }]}>{t('follow')}</Text>}
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
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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
