import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecordsApi } from '../api/records';
import { useRecordsAndCategories } from '../context/RecordsAndCategoriesContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getImageUrl } from '../utils/imageHelper';
import { useFocusEffect } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

// 各レコードアイテムコンポーネント（オリジナル画像を余白なく表示）
const RecordItem = React.memo(function RecordItem({ item, theme, t }) {
    const [originalAspect, setOriginalAspect] = useState(null);
    const imageUrl = getImageUrl(item.image_url);
    const date = useMemo(() => new Date(item.date_logged), [item.date_logged]);
    const dateString = useMemo(
        () => date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
        [date]
    );
    const showImage = !!imageUrl;

    useEffect(() => {
        if (imageUrl) {
            Image.getSize(
                imageUrl,
                (w, h) => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setOriginalAspect(w / h);
                },
                () => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setOriginalAspect(1);
                }
            );
        } else {
            setOriginalAspect(null);
        }
    }, [imageUrl]);

    const containerHeight = originalAspect != null ? SCREEN_WIDTH / originalAspect : SCREEN_WIDTH;

    return (
        <ScrollView 
            style={styles.recordItem}
            contentContainerStyle={styles.recordItemContent}
            showsVerticalScrollIndicator={true}
            removeClippedSubviews={true}
        >
            {showImage ? (
                <View style={[styles.imageContainer, { width: SCREEN_WIDTH, height: containerHeight }]}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        resizeMode="contain"
                    />
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
});

export default function RecordDetailScreen({ route, navigation }) {
    const { records: paramsRecords, initialIndex } = route.params;
    const { records: contextRecords } = useRecordsAndCategories();
    // 編集後に Context が更新されるため、Context の一覧を優先して表示する
    const records = contextRecords?.length > 0 ? contextRecords : paramsRecords;
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [scrollAreaHeight, setScrollAreaHeight] = useState(SCREEN_HEIGHT);
    const scrollViewRef = useRef(null);
    const menuButtonRef = useRef(null);
    const { deleteRecord } = useRecordsApi();
    const { loadRecords } = useRecordsAndCategories();
    const { theme } = useTheme();
    const { t } = useLanguage();

    // 表示中のレコードIDを追跡し、Context 更新後も同じレコードを指すようにする
    const currentRecordIdRef = useRef(records[initialIndex]?.id);
    const currentRecord = records[currentIndex];
    if (currentRecord?.id) currentRecordIdRef.current = currentRecord.id;

    useEffect(() => {
        const id = currentRecordIdRef.current;
        if (!id || !records?.length) return;
        const idx = records.findIndex((r) => r.id === id);
        if (idx >= 0 && idx !== currentIndex) {
            setCurrentIndex(idx);
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * idx, animated: false });
            }, 0);
        }
    }, [records]);

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
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        setShowDeleteConfirmModal(false);
        try {
            await deleteRecord(currentRecord.id);
            await loadRecords(); // キャッシュを更新
            navigation.goBack();
        } catch (error) {
            setErrorMessage(error.message || t('deleteFailed'));
            setShowErrorModal(true);
        }
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
                removeClippedSubviews={true}
                onLayout={(e) => setScrollAreaHeight(e.nativeEvent.layout.height)}
            >
                {records.map((record) => (
                    <View key={record.id.toString()} style={[styles.recordWrapper, { height: scrollAreaHeight }]}>
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
                            <Ionicons name="pencil-sharp" size={22} color={theme.colors.primary} />
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

            {/* 削除確認モーダル */}
            <Modal
                visible={showDeleteConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirmModal(false)}
            >
                <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.modalOverlayBlur}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowDeleteConfirmModal(false)}
                    >
                        <View style={[styles.confirmModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.confirmIconContainer, { backgroundColor: '#FF3B30' + '20' }]}>
                                <Ionicons name="trash-outline" size={48} color="#FF3B30" />
                            </View>
                            <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>
                                {t('deleteConfirm')}
                            </Text>
                            <Text style={[styles.confirmMessage, { color: theme.colors.secondaryText }]}>
                                {t('deleteConfirmMessage')}
                            </Text>
                            <View style={styles.confirmButtonContainer}>
                                <TouchableOpacity
                                    style={[styles.confirmCancelButton, { borderColor: theme.colors.border }]}
                                    onPress={() => setShowDeleteConfirmModal(false)}
                                >
                                    <Text style={[styles.confirmCancelButtonText, { color: theme.colors.text }]}>
                                        {t('cancel')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmDeleteButton}
                                    onPress={confirmDelete}
                                >
                                    <Text style={styles.confirmDeleteButtonText}>
                                        {t('delete')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </BlurView>
            </Modal>

            {/* エラーモーダル */}
            <Modal
                visible={showErrorModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowErrorModal(false)}
            >
                <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.modalOverlayBlur}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowErrorModal(false)}
                    >
                        <View style={[styles.errorModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.errorIconContainer, { backgroundColor: '#FF3B30' + '20' }]}>
                                <Ionicons name="close-circle" size={48} color="#FF3B30" />
                            </View>
                            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                                {t('deleteFailed')}
                            </Text>
                            <Text style={[styles.errorMessage, { color: theme.colors.secondaryText }]}>
                                {errorMessage}
                            </Text>
                            <TouchableOpacity
                                style={[styles.errorButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => setShowErrorModal(false)}
                            >
                                <Text style={styles.errorButtonText}>{t('ok')}</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </BlurView>
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
        // height は onLayout で取得した scrollAreaHeight を指定（ヘッダー分を除いた表示高さに合わせ、縦長コンテンツが最後までスクロールできるようにする）
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
        backgroundColor: '#000',
        overflow: 'hidden',
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
    modalOverlayBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlayTouchable: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmModalContent: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        minWidth: 280,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    confirmIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    confirmButtonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    confirmCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    confirmDeleteButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
    },
    confirmDeleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    errorModalContent: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        minWidth: 280,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    errorIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    errorButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 20,
        minWidth: 120,
    },
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
