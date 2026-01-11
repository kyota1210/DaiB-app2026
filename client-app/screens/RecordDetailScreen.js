import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecordsApi } from '../api/records';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getImageUrl } from '../utils/imageHelper';
import { useFocusEffect } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// 各レコードアイテムコンポーネント
const RecordItem = ({ item, theme, t }) => {
    const [imageAspectRatio, setImageAspectRatio] = useState(1);
    const imageUrl = getImageUrl(item.image_url);
    const date = new Date(item.date_logged);
    const dateString = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    React.useEffect(() => {
        if (imageUrl) {
            Image.getSize(
                imageUrl,
                (width, height) => {
                    setImageAspectRatio(width / height);
                },
                (error) => {
                    console.error('Image size fetch failed', error);
                    setImageAspectRatio(16 / 9);
                }
            );
        }
    }, [imageUrl]);

    return (
        <View style={styles.recordItem}>
            {/* タイトル */}
            {item.title && (
                <View style={styles.titleContainer}>
                    <Text 
                        style={[styles.title, { color: theme.colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.title}
                    </Text>
                </View>
            )}

            {imageUrl ? (
                <View style={[styles.imageContainer, { aspectRatio: imageAspectRatio }]}>
                    <Image source={{ uri: imageUrl }} style={styles.image} />
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
                {item.description && (
                    <Text style={[styles.description, { color: theme.colors.secondaryText }]}>
                        {item.description}
                    </Text>
                )}
            </View>
        </View>
    );
};

export default function RecordDetailScreen({ route, navigation }) {
    const { records, initialIndex } = route.params;
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const flatListRef = useRef(null);
    const menuButtonRef = useRef(null);
    const { deleteRecord } = useRecordsApi();
    const { theme } = useTheme();
    const { t } = useLanguage();

    const currentRecord = records[currentIndex];

    // スクロール時に現在のインデックスを更新
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    const handleDelete = () => {
        setShowMenu(false);
        Alert.alert(
            t('deleteConfirm'),
            t('削除します。よろしいですか？'),
            [
                { text: t('cancel') },
                {
                    text: t('delete'),
                    onPress: async () => {
                        try {
                            await deleteRecord(currentRecord.id);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert(t('deleteFailed'), error.message);
                        }
                    },
                    style: 'destructive'
                }
            ]
        );
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

    // 各レコードのレンダリング
    const renderRecordItem = ({ item }) => {
        return <RecordItem item={item} theme={theme} t={t} />;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* ヘッダー */}
            <View style={[styles.header, { 
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border 
            }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <View style={styles.headerSpacer} />
                <TouchableOpacity 
                    ref={menuButtonRef}
                    onPress={handleMenuPress} 
                    style={styles.menuButton}
                >
                    <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={records}
                renderItem={renderRecordItem}
                keyExtractor={(item) => item.id.toString()}
                initialScrollIndex={initialIndex}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(data, index) => ({
                    length: SCREEN_HEIGHT - 100, // ヘッダー分を引いた画面の高さ
                    offset: (SCREEN_HEIGHT - 100) * index,
                    index,
                })}
                showsVerticalScrollIndicator={true}
                pagingEnabled={true}
                decelerationRate="fast"
                snapToInterval={SCREEN_HEIGHT - 100}
                snapToAlignment="start"
            />

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
                            <Ionicons name="pencil" size={22} color={theme.colors.primary} />
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
    headerSpacer: {
        flex: 1,
    },
    menuButton: {
        padding: 4,
    },
    recordItem: {
        height: SCREEN_HEIGHT - 100, // ヘッダー分を引いた画面の高さ
    },
    titleContainer: {
        paddingHorizontal: 6,
        paddingTop: 12,
    },
    title: {
        flex: 1,
        fontSize: 10,
    },
    imageContainer: {
        width: '100%',
        backgroundColor: '#000',
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
        padding: 10,
        minHeight: 100,
    },
    date: { 
        fontSize: 14, 
        marginBottom: 8 
    },
    title: { 
        fontSize: 18, 
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
});
