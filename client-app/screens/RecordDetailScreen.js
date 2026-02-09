import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecordsApi } from '../api/records';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getImageUrl } from '../utils/imageHelper';
import { useFocusEffect } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

// 各レコードアイテムコンポーネント
const RecordItem = ({ item, theme, t }) => {
    const [imageAspectRatio, setImageAspectRatio] = useState(1);
    const [displayImageSize, setDisplayImageSize] = useState({ width: 0, height: 0 });
    const imageUrl = getImageUrl(item.image_url);
    const date = new Date(item.date_logged);
    const dateString = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    // トリミング情報（文字列を数値に変換）
    const aspectRatio = item.aspect_ratio || '1:1';
    const zoomLevel = parseFloat(item.zoom_level) || 1.0; // 初期スケールからの追加ズーム
    const positionX = parseInt(item.position_x) || 0;
    const positionY = parseInt(item.position_y) || 0;

    React.useEffect(() => {
        if (imageUrl) {
            Image.getSize(
                imageUrl,
                (width, height) => {
                    // 表示コンテナのサイズを計算
                    let containerWidth, containerHeight;
                    if (aspectRatio === '1:1') {
                        containerWidth = SCREEN_WIDTH;
                        containerHeight = SCREEN_WIDTH;
                        setImageAspectRatio(1);
                    } else if (aspectRatio === '4:3') {
                        containerWidth = SCREEN_WIDTH;
                        containerHeight = SCREEN_WIDTH * 0.75;
                        setImageAspectRatio(4 / 3);
                    } else if (aspectRatio === '3:4') {
                        containerWidth = SCREEN_WIDTH * 0.75;
                        containerHeight = SCREEN_WIDTH;
                        setImageAspectRatio(3 / 4);
                    } else {
                        containerWidth = SCREEN_WIDTH;
                        containerHeight = SCREEN_WIDTH;
                        setImageAspectRatio(1);
                    }
                    
                    // 初期スケールを計算（元画像を画面サイズに合わせる）
                    const initialScale = Math.max(
                        containerWidth / width,
                        containerHeight / height
                    );
                    
                    // 表示用サイズ = 元画像 × 初期スケール
                    setDisplayImageSize({
                        width: width * initialScale,
                        height: height * initialScale
                    });
                },
                (error) => {
                    console.error('Image size fetch failed', error);
                    setImageAspectRatio(1);
                }
            );
        }
    }, [imageUrl, aspectRatio]);

    return (
        <ScrollView 
            style={styles.recordItem}
            contentContainerStyle={styles.recordItemContent}
            showsVerticalScrollIndicator={true}
        >
            {imageUrl && displayImageSize.width > 0 ? (
                <View style={[
                    styles.imageContainer, 
                    { 
                        aspectRatio: imageAspectRatio, 
                        overflow: 'hidden', 
                        backgroundColor: '#000', 
                        justifyContent: 'center', 
                        alignItems: 'center'
                    },
                    aspectRatio === '3:4' && { width: SCREEN_WIDTH * 0.75, alignSelf: 'center' }
                ]}>
                    <Image 
                        source={{ uri: imageUrl }} 
                        style={{
                            width: displayImageSize.width,
                            height: displayImageSize.height,
                            transform: [
                                { translateX: positionX },
                                { translateY: positionY },
                                { scale: zoomLevel } // 初期スケールからの追加ズーム
                            ]
                        }}
                        resizeMode="cover"
                    />
                </View>
            ) : imageUrl ? (
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
        </ScrollView>
    );
};

export default function RecordDetailScreen({ route, navigation }) {
    const { records, initialIndex } = route.params;
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const scrollViewRef = useRef(null);
    const menuButtonRef = useRef(null);
    const { deleteRecord } = useRecordsApi();
    const { theme } = useTheme();
    const { t } = useLanguage();

    const currentRecord = records[currentIndex];

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

            {/* 横スワイプで投稿を切り替えるScrollView */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                decelerationRate="fast"
                style={styles.horizontalScrollView}
            >
                {records.map((record, index) => (
                    <View key={record.id.toString()} style={styles.recordWrapper}>
                        <RecordItem item={record} theme={theme} t={t} />
                    </View>
                ))}
            </ScrollView>

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
    horizontalScrollView: {
        flex: 1,
    },
    recordWrapper: {
        width: SCREEN_WIDTH,
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
});
