import React, { useState, useCallback, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { searchUsers } from '../api/user';
import { follow, unfollow } from '../api/follows';
import { getImageUrl } from '../utils/imageHelper';

const UserSearchScreen = ({ navigation }) => {
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [followingIds, setFollowingIds] = useState(new Set());
    const [busyId, setBusyId] = useState(null);

    const doSearch = useCallback(async () => {
        const q = query.trim();
        if (!q || !userToken) return;
        setLoading(true);
        try {
            const res = await searchUsers(userToken, q);
            const list = res.users || [];
            setUsers(list);
            setFollowingIds(new Set(list.filter((u) => u.is_following).map((u) => u.id)));
        } catch (err) {
            console.error('search error', err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [query, userToken]);

    const handleFollow = async (userId, isCurrentlyFollowing, userName) => {
        if (busyId !== null) return;
        if (isCurrentlyFollowing) {
            const name = (userName || '').trim() || t('thisUser');
            const message = t('unfollowConfirmMessageWithName').replace('{{name}}', name);
            Alert.alert(
                '',
                message,
                [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('unfollow'), style: 'destructive', onPress: () => doUnfollow(userId) },
                ]
            );
            return;
        }
        setBusyId(userId);
        try {
            await follow(userToken, userId);
            setFollowingIds((prev) => new Set(prev).add(userId));
        } catch (err) {
            console.error('follow/unfollow error', err);
        } finally {
            setBusyId(null);
        }
    };

    const doUnfollow = async (userId) => {
        if (busyId !== null) return;
        setBusyId(userId);
        try {
            await unfollow(userToken, userId);
            setFollowingIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        } catch (err) {
            console.error('follow/unfollow error', err);
        } finally {
            setBusyId(null);
        }
    };

    const renderUser = ({ item }) => {
        const avatarUrl = getImageUrl(item.avatar_url);
        const isFollowing = followingIds.has(item.id);
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
                <TouchableOpacity
                    style={[
                        styles.followButton,
                        isFollowing ? { backgroundColor: theme.colors.secondaryBackground } : { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => handleFollow(item.id, isFollowing, item.user_name)}
                    disabled={isBusy}
                >
                    {isBusy ? (
                        <ActivityIndicator size="small" color={isFollowing ? theme.colors.text : '#fff'} />
                    ) : (
                        <Text style={[styles.followButtonText, { color: isFollowing ? theme.colors.text : '#fff' }]}>
                            {isFollowing ? t('unfollow') : t('follow')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <TextInput
                    style={[styles.searchInput, { backgroundColor: theme.colors.secondaryBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder={t('searchUsersPlaceholder')}
                    placeholderTextColor={theme.colors.inactive}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={doSearch}
                    returnKeyType="search"
                    autoFocus
                />
                <TouchableOpacity onPress={doSearch} style={styles.searchBtn}>
                    <Ionicons name="search" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
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
                        query.trim() ? (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>{t('noUsers')}</Text>
                            </View>
                        ) : null
                    }
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
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        gap: 8,
    },
    backBtn: { padding: 8 },
    searchInput: {
        flex: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        borderWidth: 1,
    },
    searchBtn: { padding: 8 },
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

export default UserSearchScreen;
