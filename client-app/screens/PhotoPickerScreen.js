import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Dimensions, ScrollView as RNScrollView, TextInput, Platform, Modal, KeyboardAvoidingView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { useRecordsApi } from '../api/records';
import { useRecordsAndCategories } from '../context/RecordsAndCategoriesContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getImageUrl } from '../utils/imageHelper';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function PhotoPickerScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    
    // 編集モードの判定
    const editRecord = route.params?.record;
    const isEditMode = !!editRecord;
    
    // 画像関連（常にオリジナル表示・保存）
    const [selectedImage, setSelectedImage] = useState(
        editRecord?.image_url ? getImageUrl(editRecord.image_url) : null
    );
    const [isNewImageSelected, setIsNewImageSelected] = useState(false);
    // 元画像のサイズ（表示コンテナ用）
    const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
    
    // フォーム入力
    const [title, setTitle] = useState(editRecord?.title || '');
    const [description, setDescription] = useState(editRecord?.description || '');
    const [dateLogged, setDateLogged] = useState(
        editRecord ? new Date(editRecord.date_logged) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(editRecord?.category_id || null);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // キーボード管理
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef(null);

    // 各入力フィールドのref
    const titleInputRef = useRef(null);
    const captionInputRef = useRef(null);
    
    const { createRecord, updateRecord } = useRecordsApi();
    const { categories, loadCategories, loadingCategories, loadRecords } = useRecordsAndCategories();
    
    // カテゴリーを取得（キャッシュになければ読み込む）
    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    // キーボードイベントリスナー
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);
    
    // 初回マウント時に画像選択を開く（新規作成モードのみ）
    useEffect(() => {
        if (!isEditMode) {
            pickImage();
        } else if (selectedImage) {
            Image.getSize(
                selectedImage,
                (width, height) => setOriginalImageSize({ width, height }),
                () => setOriginalImageSize({ width: SCREEN_WIDTH, height: SCREEN_WIDTH })
            );
        }
    }, []);

    // 表示コンテナサイズ（オリジナル比率で幅いっぱい）
    const getContainerDimensions = () => {
        if (originalImageSize?.width && originalImageSize?.height) {
            const { width: w, height: h } = originalImageSize;
            return { width: SCREEN_WIDTH, height: SCREEN_WIDTH * (h / w) };
        }
        return { width: SCREEN_WIDTH, height: SCREEN_WIDTH };
    };

    // 画像を選択
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('permissionError'), t('cameraRollPermission'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: false,
            quality: 1.0,
        });

        // 新規作成で最初の写真選択を×で閉じた場合はホームに戻る
        if (result.canceled && !isEditMode && !selectedImage) {
            navigation.goBack();
            return;
        }

        if (!result.canceled && result.assets && result.assets[0]) {
            const uri = result.assets[0].uri;
            setSelectedImage(uri);
            setIsNewImageSelected(true);
            Image.getSize(uri, (width, height) => setOriginalImageSize({ width, height }), () => {});
        }
    };

    // 作成・更新ボタン
    const handlePost = async () => {
        if (!selectedImage) {
            setErrorMessage(t('photoSelectRequired'));
            setShowErrorModal(true);
            return;
        }
        
        if (!dateLogged) {
            setErrorMessage(t('dateRequired'));
            setShowErrorModal(true);
            return;
        }

        setLoading(true);
        try {
            const recordData = { 
                title,
                description, 
                date_logged: dateLogged.toISOString().split('T')[0], 
                category_id: selectedCategoryId,
            };
            if (isNewImageSelected) {
                recordData.imageUri = selectedImage;
            }

            if (isEditMode) {
                await updateRecord(editRecord.id, recordData);
                await loadRecords(); // キャッシュを更新
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }, 2000);
            } else {
                await createRecord(recordData);
                await loadRecords(); // キャッシュを更新
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }, 2000);
            }
        } catch (error) {
            setErrorMessage(error.message || (isEditMode ? t('updateFailed') : t('createFailed')));
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };
    
    // 日付変更ハンドラ
    const onChangeDate = (event, selectedDate) => {
        if (event.type === 'dismissed') {
            setShowDatePicker(false);
            return;
        }

        const currentDate = selectedDate || dateLogged;
        setShowDatePicker(false);
        
        if (selectedDate) {
            setDateLogged(currentDate);
        }
    };
    
    const formattedDate = dateLogged.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // 入力フィールドにフォーカスしたときのスクロール処理
    const handleInputFocus = (inputRef) => {
        setTimeout(() => {
            inputRef.current?.measureLayout(
                scrollViewRef.current,
                (x, y) => {
                    scrollViewRef.current?.scrollTo({ 
                        y: y - 20, // 入力欄の少し上にスクロール
                        animated: true 
                    });
                },
                () => {}
            );
        }, 300); // キーボードが開くのを待つ
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <KeyboardAvoidingView 
                    style={[styles.container, { backgroundColor: theme.colors.background }]} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
                >
                    {/* ヘッダー */}
                    <View style={[styles.header, { 
                        backgroundColor: theme.colors.background,
                        borderBottomColor: theme.colors.border 
                    }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                            {isEditMode ? t('editRecord') : '新規作成'}
                        </Text>
                        <TouchableOpacity 
                            onPress={handlePost} 
                            style={styles.nextButton}
                            disabled={!selectedImage || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <Text style={[
                                    styles.nextButtonText, 
                                    { color: selectedImage ? theme.colors.primary : theme.colors.inactive }
                                ]}>
                                    {isEditMode ? t('update') : '作成'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        ref={scrollViewRef}
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingHorizontal: 0, paddingTop: 0 },
                            keyboardVisible && { paddingBottom: 300 }
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={true}
                    >
                        {selectedImage ? (
                            <>
                                {/* 画像プレビュー（詳細画面と同じ構造で画像上でもスクロール可能に） */}
                                <View style={[
                                    styles.imageWrapper,
                                    (() => {
                                        const c = getContainerDimensions();
                                        return { width: c.width, height: c.height };
                                    })()
                                ]}>
                                    {(originalImageSize.width > 0 && originalImageSize.height > 0) || isEditMode ? (
                                        <Image
                                            source={{ uri: selectedImage }}
                                            style={isEditMode && (originalImageSize.width === 0 || originalImageSize.height === 0) ? styles.editModeImage : StyleSheet.absoluteFill}
                                            resizeMode={isEditMode && (originalImageSize.width === 0 || originalImageSize.height === 0) ? 'contain' : 'cover'}
                                        />
                                    ) : (
                                        <ActivityIndicator size="large" color="#fff" />
                                    )}
                                    <View style={styles.overlayControls}>
                                        <TouchableOpacity
                                            style={[styles.overlayButton, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                                            onPress={pickImage}
                                        >
                                            <Ionicons name="images" size={20} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* 入力フォームエリア */}
                                <View style={styles.formSection}>
                                    {/* 日付 */}
                                    <View style={styles.inputGroup}>
                                        <TouchableOpacity 
                                            style={styles.simpleDateContainer}
                                            onPress={() => setShowDatePicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="calendar-outline" size={20} color={theme.colors.secondaryText} style={{ marginRight: 8 }} />
                                            <Text style={[styles.simpleDateText, { color: theme.colors.text }]}>{formattedDate}</Text>
                                        </TouchableOpacity>
                                        
                                        {showDatePicker && Platform.OS === 'android' && (
                                            <DateTimePicker
                                                testID="dateTimePicker"
                                                value={dateLogged}
                                                mode="date"
                                                display="default"
                                                onChange={onChangeDate}
                                            />
                                        )}

                                        {showDatePicker && Platform.OS === 'ios' && (
                                            <Modal
                                                transparent={true}
                                                animationType="fade"
                                                visible={showDatePicker}
                                                onRequestClose={() => setShowDatePicker(false)}
                                            >
                                                <TouchableOpacity 
                                                    style={styles.modalOverlay} 
                                                    activeOpacity={1} 
                                                    onPress={() => setShowDatePicker(false)}
                                                >
                                                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                                                        <DateTimePicker
                                                            testID="dateTimePicker"
                                                            value={dateLogged}
                                                            mode="date"
                                                            display="inline"
                                                            onChange={onChangeDate}
                                                            style={styles.iosDatePicker}
                                                            themeVariant="light"
                                                        />
                                                    </View>
                                                </TouchableOpacity>
                                            </Modal>
                                        )}
                                    </View>

                                    {/* タイトル */}
                                    <View style={styles.inputGroup} ref={titleInputRef}>
                                        <TextInput
                                            style={[styles.titleInput, { 
                                                backgroundColor: theme.colors.secondaryBackground,
                                                color: theme.colors.text,
                                                borderColor: theme.colors.border
                                            }]}
                                            placeholder={t('titlePlaceholder')}
                                            placeholderTextColor={theme.colors.secondaryText}
                                            value={title}
                                            onChangeText={setTitle}
                                            onFocus={() => handleInputFocus(titleInputRef)}
                                        />
                                    </View>

                                    {/* カテゴリー */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: theme.colors.secondaryText }]}>
                                            {t('category')}
                                        </Text>
                                        {loadingCategories ? (
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                        ) : (
                                            <RNScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                style={styles.categoryScrollView}
                                            >
                                                {categories.filter(c => c.id !== 'all').map(category => (
                                                    <TouchableOpacity
                                                        key={category.id}
                                                        style={[
                                                            styles.categoryItem,
                                                            { 
                                                                backgroundColor: selectedCategoryId === category.id 
                                                                    ? theme.colors.primary 
                                                                    : theme.colors.secondaryBackground,
                                                                borderColor: theme.colors.border
                                                            }
                                                        ]}
                                                        onPress={() => setSelectedCategoryId(category.id)}
                                                    >
                                                        {category.icon_url && (
                                                            <Image 
                                                                source={{ uri: getImageUrl(category.icon_url) }} 
                                                                style={styles.categoryIcon}
                                                            />
                                                        )}
                                                        <Text style={[
                                                            styles.categoryName, 
                                                            { color: selectedCategoryId === category.id 
                                                                ? '#fff' 
                                                                : theme.colors.text 
                                                            }
                                                        ]}>
                                                            {category.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </RNScrollView>
                                        )}
                                    </View>

                                    {/* キャプション（内部スクロールなし＝親の ScrollView で全体スクロール） */}
                                    <View style={styles.captionGroup} ref={captionInputRef}>
                                        <TextInput
                                            style={[styles.captionInput, { 
                                                color: theme.colors.text
                                            }]}
                                            placeholder={t('キャプションを入力...')}
                                            placeholderTextColor={theme.colors.secondaryText}
                                            value={description}
                                            onChangeText={setDescription}
                                            multiline
                                            scrollEnabled={false}
                                            textAlignVertical="top"
                                            onFocus={() => handleInputFocus(captionInputRef)}
                                        />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.noImageContainer}>
                                <Ionicons name="image-outline" size={80} color={theme.colors.inactive} />
                                <Text style={[styles.noImageText, { color: theme.colors.secondaryText }]}>
                                    写真を読み込んでいます...
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* 成功モーダル */}
                <Modal
                    visible={showSuccessModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowSuccessModal(false)}
                >
                    <BlurView
                        intensity={20}
                        tint="dark"
                        style={styles.modalOverlayBlur}
                    >
                        <TouchableOpacity
                            style={styles.modalOverlayTouchable}
                            activeOpacity={1}
                            onPress={() => setShowSuccessModal(false)}
                        >
                            <View style={[styles.successModalContent, { backgroundColor: theme.colors.card }]}>
                                <View style={[styles.successIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                                    <Ionicons name="checkmark-circle" size={48} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.successTitle, { color: theme.colors.text }]}>
                                    {t('success')}
                                </Text>
                                <Text style={[styles.successMessage, { color: theme.colors.secondaryText }]}>
                                    {isEditMode ? t('recordUpdated') : t('recordAdded')}
                                </Text>
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
                                    {t('error')}
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
        </TouchableWithoutFeedback>
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
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
        width: 60,
    },
    nextButton: {
        padding: 4,
        width: 60,
        alignItems: 'flex-end',
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    imageWrapper: {
        width: SCREEN_WIDTH,
        backgroundColor: '#000',
        overflow: 'hidden',
        position: 'relative',
        marginHorizontal: 0,
    },
    editModeImage: {
        width: '100%',
        height: '100%',
    },
    overlayControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 16,
        pointerEvents: 'box-none',
        gap: 12,
    },
    overlayButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 0,
        paddingHorizontal: 0,
    },
    formSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    inputGroup: {
        marginBottom: 8,
    },
    captionGroup: {
        marginTop: 8,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    simpleDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 0,
    },
    simpleDateText: {
        fontSize: 15,
        fontWeight: '500',
    },
    titleInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
    },
    categoryScrollView: {
        flexGrow: 0,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    categoryIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 6,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '500',
    },
    captionInput: {
        fontSize: 16,
        minHeight: 100,
        paddingVertical: 8,
        lineHeight: 24,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    successModalContent: {
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
    successIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
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
    iosDatePicker: {
        width: 320,
    },
    noImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 400,
    },
    noImageText: {
        marginTop: 16,
        fontSize: 16,
    },
});
