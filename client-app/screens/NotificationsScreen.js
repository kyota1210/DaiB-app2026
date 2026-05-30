import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';
import {
    getInAppNotifications,
    markAsRead,
    markAllAsRead,
} from '../api/notifications';

const NotificationsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const lastModalItemRef = React.useRef(null);
    if (selectedItem) lastModalItemRef.current = selectedItem;
    const modalItem = selectedItem ?? lastModalItemRef.current;

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const data = await getInAppNotifications();
            setNotifications(data);
        } catch (e) {
            console.warn('[NotificationsScreen] load failed:', e?.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handlePressItem = useCallback(async (item) => {
        if (!item.is_read) {
            await markAsRead(item.id);
            setNotifications(prev =>
                prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
            );
        }
        setSelectedItem({ ...item, is_read: true });
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedItem(null);
    }, []);

    const handleMarkAllRead = useCallback(async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }, []);

    const hasUnread = notifications.some(n => !n.is_read);

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const renderItem = ({ item }) => {
        const isSystem = item.type === 'system';
        const iconName = isSystem ? 'megaphone-outline' : 'shield-checkmark-outline';
        const iconColor = isSystem
            ? (theme.colors.primary ?? '#4E5F5C')
            : '#E05A5A';

        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    {
                        backgroundColor: item.is_read
                            ? theme.colors.background
                            : (theme.isDark ? '#1e2a28' : '#f0f7f5'),
                        borderBottomColor: theme.colors.border,
                    },
                ]}
                onPress={() => handlePressItem(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconWrap, { backgroundColor: theme.isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                    <Ionicons name={iconName} size={20} color={iconColor} />
                </View>

                <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                        <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        {!item.is_read && (
                            <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
                        )}
                    </View>
                    <Text style={[styles.itemBody, { color: theme.colors.secondaryText }]} numberOfLines={2}>
                        {item.body}
                    </Text>
                    <Text style={[styles.itemDate, { color: theme.colors.inactive ?? theme.colors.secondaryText }]}>
                        {formatDate(item.created_at)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={theme.colors.inactive ?? theme.colors.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>
                {t('notificationsEmpty')}
            </Text>
        </View>
    );

    const modalIsSystem = modalItem?.type === 'system';
    const modalIconName = modalIsSystem ? 'megaphone-outline' : 'shield-checkmark-outline';
    const modalIconColor = modalIsSystem ? (theme.colors.primary ?? '#4E5F5C') : '#E05A5A';

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <ScreenHeader title={t('notifications')} onBack={() => navigation.goBack()} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader
                title={t('notifications')}
                onBack={() => navigation.goBack()}
                rightAction={
                    hasUnread ? (
                        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
                            <Text style={[styles.markAllText, { color: theme.colors.primary ?? '#4E5F5C' }]}>
                                {t('markAllRead')}
                            </Text>
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => load(true)}
                        tintColor={theme.colors.primary}
                    />
                }
                style={{ backgroundColor: theme.colors.background }}
            />

            {/* 詳細モーダル */}
            <Modal
                visible={!!selectedItem}
                transparent
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={handleCloseModal}
                >
                    <TouchableOpacity
                        style={[styles.modalCard, { backgroundColor: theme.colors.background }]}
                        activeOpacity={1}
                        onPress={() => {}}
                    >
                        {/* アイコン + タイトル */}
                        <View style={styles.modalTitleRow}>
                            <View style={[styles.modalIconWrap, { backgroundColor: theme.isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                                <Ionicons name={modalIconName} size={22} color={modalIconColor} />
                            </View>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                {modalItem?.title}
                            </Text>
                        </View>

                        {/* 日付 */}
                        <Text style={[styles.modalDate, { color: theme.colors.inactive ?? theme.colors.secondaryText }]}>
                            {modalItem ? formatDate(modalItem.created_at) : ''}
                        </Text>

                        {/* 区切り線 */}
                        <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />

                        {/* 本文（スクロール可能） */}
                        <ScrollView
                            style={styles.modalBodyScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={[styles.modalBody, { color: theme.colors.text }]}>
                                {modalItem?.body}
                            </Text>
                        </ScrollView>

                        {/* 閉じるボタン */}
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: theme.colors.primary ?? '#4E5F5C' }]}
                            onPress={handleCloseModal}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeButtonText}>{t('close')}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
        flexShrink: 0,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        marginRight: 6,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
    },
    itemBody: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 6,
    },
    itemDate: {
        fontSize: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
    },
    markAllButton: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    markAllText: {
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        width: '100%',
        height: '70%',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 20,
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 16,
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 6,
    },
    modalIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    modalTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 25,
    },
    modalDate: {
        fontSize: 12,
        marginBottom: 14,
        marginLeft: 56,
    },
    modalDivider: {
        height: StyleSheet.hairlineWidth,
        marginBottom: 14,
    },
    modalBodyScroll: {
        flex: 1,
        marginBottom: 20,
    },
    modalBody: {
        fontSize: 15,
        lineHeight: 24,
    },
    closeButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default NotificationsScreen;
