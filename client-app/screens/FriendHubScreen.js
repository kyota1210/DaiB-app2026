import React, { useState, useCallback, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getFriends } from '../api/user';
import AppImage from '../components/AppImage';
import { getAvatarThumbnailUrl } from '../utils/imageHelper';
import { THUMB_AVATAR_LG } from '../constants/imageThumbs';

const FriendHubScreen = ({ navigation }) => {
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFriends = useCallback(async () => {
        if (!userToken) return;
        try {
            const friendsRes = await getFriends(userToken);
            setFriends(friendsRes.users || []);
        } catch (err) {
            console.error('friend hub fetch error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userToken]);

    const initialLoadDone = useRef(false);

    useFocusEffect(
        useCallback(() => {
            if (!initialLoadDone.current) {
                setLoading(true);
                initialLoadDone.current = true;
            }
            fetchFriends();
        }, [fetchFriends])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchFriends();
    };

    const renderUserRow = ({ item }) => {
        const avatarUrl = getAvatarThumbnailUrl(item.avatar_url, item.updated_at, THUMB_AVATAR_LG);
        return (
            <TouchableOpacity
                style={[styles.row, { borderBottomColor: theme.colors.border }]}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                activeOpacity={0.7}
            >
                {avatarUrl ? (
                    <AppImage uri={avatarUrl} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.border }]}>
                        <Ionicons name="person" size={24} color={theme.colors.inactive} />
                    </View>
                )}
                <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.user_name || ''}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('friendsList')} onBack={() => navigation.goBack()} />
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={friends}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderUserRow}
                    initialNumToRender={12}
                    maxToRenderPerBatch={12}
                    windowSize={5}
                    removeClippedSubviews
                    contentContainerStyle={friends.length === 0 ? styles.emptyList : undefined}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>
                                {t('noFriends')}
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
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
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyList: { flexGrow: 1 },
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
    userName: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600' },
});

export default FriendHubScreen;
