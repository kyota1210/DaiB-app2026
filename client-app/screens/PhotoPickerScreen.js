import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, PanResponder, Dimensions, ScrollView, TextInput, Platform, Modal, KeyboardAvoidingView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { useRecordsApi } from '../api/records';
import { fetchCategories } from '../api/categories';
import DateTimePicker from '@react-native-community/datetimepicker';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function PhotoPickerScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    
    // 編集モードの判定
    const editRecord = route.params?.record;
    const isEditMode = !!editRecord;
    
    // 画像関連
    const [selectedImage, setSelectedImage] = useState(
        editRecord?.image_url 
            ? (editRecord.image_url.startsWith('http') 
                ? editRecord.image_url 
                : `http://192.168.11.12:3001${editRecord.image_url.startsWith('/') ? '' : '/'}${editRecord.image_url}`)
            : null
    );
    // 編集モードでは、保存されている画像がすでにトリミング済みなので、そのまま表示
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [aspectMode, setAspectMode] = useState(editRecord?.aspect_ratio || '1:1');
    const [scale, setScale] = useState(1.0);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    
    // フォーム入力
    const [title, setTitle] = useState(editRecord?.title || '');
    const [description, setDescription] = useState(editRecord?.description || '');
    const [dateLogged, setDateLogged] = useState(
        editRecord ? new Date(editRecord.date_logged) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(editRecord?.category_id || null);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    
    // キーボード管理
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    
    // 各入力フィールドのref
    const titleInputRef = useRef(null);
    const captionInputRef = useRef(null);
    
    const { createRecord, updateRecord } = useRecordsApi();
    
    // 最新の値をrefで保持
    const scaleRef = useRef(scale);
    const panPositionRef = useRef(panPosition);
    const imageSizeRef = useRef(imageSize);
    const aspectModeRef = useRef(aspectMode);
    
    useEffect(() => { scaleRef.current = scale; }, [scale]);
    useEffect(() => { panPositionRef.current = panPosition; }, [panPosition]);
    useEffect(() => { imageSizeRef.current = imageSize; }, [imageSize]);
    useEffect(() => { aspectModeRef.current = aspectMode; }, [aspectMode]);
    
    // カテゴリーを取得
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await fetchCategories(userToken);
                setCategories(data);
            } catch (error) {
                console.error(t('categoryFetchError'), error);
            } finally {
                setCategoriesLoading(false);
            }
        };
        loadCategories();
    }, [userToken, t]);
    
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
            // 編集モードでも画像サイズを取得してみる（エラーハンドリング付き）
            Image.getSize(
                selectedImage, 
                (width, height) => {
                    console.log('Successfully got image size:', width, height);
                    setImageSize({ width, height });
                    const initialScale = calculateInitialScale(width, height, aspectMode);
                    setScale(initialScale);
                },
                (error) => {
                    console.log('Failed to get size for image:', selectedImage, error);
                    // エラー時は強制的にデフォルトサイズを設定
                    setImageSize({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
                    setScale(1.0);
                }
            );
        }
    }, []);
    
    // ジェスチャー管理用
    const gestureState = useRef({
        isPinching: false,
        startScale: 1.0,
        startPan: { x: 0, y: 0 },
        startDistance: 0,
    }).current;
    
    // 2点間の距離を計算
    const getDistance = (touch1, touch2) => {
        const dx = touch1.pageX - touch2.pageX;
        const dy = touch1.pageY - touch2.pageY;
        return Math.sqrt(dx * dx + dy * dy);
    };
    
    // ドラッグ範囲を制限する関数
    const constrainPan = useRef((x, y, scaleValue, imgSize, mode) => {
        if (!imgSize.width || !imgSize.height) {
            return { x: 0, y: 0 };
        }
        
        const scaledWidth = imgSize.width * scaleValue;
        const scaledHeight = imgSize.height * scaleValue;
        
        let containerWidth, containerHeight;
        
        if (mode === '1:1') {
            containerWidth = SCREEN_WIDTH;
            containerHeight = SCREEN_WIDTH;
        } else if (mode === '4:3') {
            containerWidth = SCREEN_WIDTH;
            containerHeight = SCREEN_WIDTH * 0.75;
        } else if (mode === '3:4') {
            containerWidth = SCREEN_WIDTH * 0.75;
            containerHeight = SCREEN_WIDTH;
        } else {
            containerWidth = SCREEN_WIDTH;
            containerHeight = SCREEN_WIDTH;
        }
        
        // 画像が選択範囲より小さい方向は中央固定
        const canMoveX = scaledWidth > containerWidth;
        const canMoveY = scaledHeight > containerHeight;
        
        const maxX = canMoveX ? (scaledWidth - containerWidth) / 2 : 0;
        const maxY = canMoveY ? (scaledHeight - containerHeight) / 2 : 0;
        
        return {
            x: canMoveX ? Math.max(-maxX, Math.min(maxX, x)) : 0,
            y: canMoveY ? Math.max(-maxY, Math.min(maxY, y)) : 0
        };
    }).current;
    
    // 初期スケールを計算
    const calculateInitialScale = (width, height, mode) => {
        if (mode === '1:1') {
            return Math.max(SCREEN_WIDTH / width, SCREEN_WIDTH / height);
        } else if (mode === '4:3') {
            const targetHeight = SCREEN_WIDTH * 0.75;
            return Math.max(SCREEN_WIDTH / width, targetHeight / height);
        } else if (mode === '3:4') {
            const targetWidth = SCREEN_WIDTH * 0.75;
            return Math.max(targetWidth / width, SCREEN_WIDTH / height);
        }
        return 1.0;
    };
    
    // 最小スケールを計算
    const calculateMinScale = (width, height, mode) => {
        if (mode === '1:1') {
            return Math.max(SCREEN_WIDTH / width, SCREEN_WIDTH / height);
        } else if (mode === '4:3') {
            const targetHeight = SCREEN_WIDTH * 0.75;
            return Math.max(SCREEN_WIDTH / width, targetHeight / height);
        } else if (mode === '3:4') {
            const targetWidth = SCREEN_WIDTH * 0.75;
            return Math.max(targetWidth / width, SCREEN_WIDTH / height);
        }
        return 0.5;
    };

    // PanResponder
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderTerminationRequest: () => false,
            
            onPanResponderGrant: (evt) => {
                // 画像プレビューをタッチしたらスクロールを無効化
                setScrollEnabled(false);
                
                const touches = evt.nativeEvent.touches;
                
                if (touches.length >= 2) {
                    // 1:1モード以外ではピンチズーム不可
                    const currentMode = aspectModeRef.current;
                    if (currentMode !== '1:1') {
                        gestureState.isPinching = false;
                        return;
                    }
                    
                    gestureState.isPinching = true;
                    gestureState.startScale = scaleRef.current;
                    gestureState.startDistance = getDistance(touches[0], touches[1]);
                    gestureState.startPan = { ...panPositionRef.current };
                } else {
                    gestureState.isPinching = false;
                    gestureState.startPan = { ...panPositionRef.current };
                }
            },
            
            onPanResponderMove: (evt, gestureState_) => {
                const touches = evt.nativeEvent.touches;
                
                if (touches.length >= 2) {
                    // 1:1モード以外ではピンチズーム不可
                    const currentMode = aspectModeRef.current;
                    if (currentMode !== '1:1') {
                        gestureState.isPinching = false;
                        return;
                    }
                    
                    if (!gestureState.isPinching) {
                        gestureState.isPinching = true;
                        gestureState.startScale = scaleRef.current;
                        gestureState.startDistance = getDistance(touches[0], touches[1]);
                        gestureState.startPan = { ...panPositionRef.current };
                        return;
                    }
                    
                    const currentDistance = getDistance(touches[0], touches[1]);
                    const scaleChange = currentDistance / gestureState.startDistance;
                    let newScale = gestureState.startScale * scaleChange;
                    
                    const minScale = calculateMinScale(
                        imageSizeRef.current.width,
                        imageSizeRef.current.height,
                        currentMode
                    );
                    const maxScale = 5.0;
                    newScale = Math.max(minScale, Math.min(newScale, maxScale));
                    
                    setScale(newScale);
                    
                    // スケール変更時、パン位置を再計算
                    const constrainedPan = constrainPan(
                        panPositionRef.current.x,
                        panPositionRef.current.y,
                        newScale,
                        imageSizeRef.current,
                        currentMode
                    );
                    setPanPosition(constrainedPan);
                    
                } else if (touches.length === 1) {
                    if (gestureState.isPinching) {
                        gestureState.isPinching = false;
                        gestureState.startPan = { ...panPositionRef.current };
                        return;
                    }
                    
                    const newX = gestureState.startPan.x + gestureState_.dx;
                    const newY = gestureState.startPan.y + gestureState_.dy;
                    
                    const constrainedPan = constrainPan(
                        newX,
                        newY,
                        scaleRef.current,
                        imageSizeRef.current,
                        aspectModeRef.current
                    );
                    setPanPosition(constrainedPan);
                }
            },
            
            onPanResponderRelease: () => {
                gestureState.isPinching = false;
                // 画像タッチ終了でスクロールを有効化
                setScrollEnabled(true);
            },
            
            onPanResponderTerminate: () => {
                gestureState.isPinching = false;
                // 画像タッチ終了でスクロールを有効化
                setScrollEnabled(true);
            },
        })
    ).current;

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

        if (!result.canceled && result.assets && result.assets[0]) {
            const uri = result.assets[0].uri;
            setSelectedImage(uri);
            
            Image.getSize(uri, (width, height) => {
                setImageSize({ width, height });
                const initialScale = calculateInitialScale(width, height, aspectMode);
                setScale(initialScale);
                setPanPosition({ x: 0, y: 0 });
                gestureState.startScale = initialScale;
            });
        }
    };

    // アスペクト比切り替え
    const toggleAspectMode = () => {
        let newMode;
        if (aspectMode === '1:1') {
            newMode = imageSize.width >= imageSize.height ? '4:3' : '3:4';
        } else {
            newMode = '1:1';
        }
        
        setAspectMode(newMode);
        
        const initialScale = calculateInitialScale(imageSize.width, imageSize.height, newMode);
        setScale(initialScale);
        setPanPosition({ x: 0, y: 0 });
        gestureState.startScale = initialScale;
    };

    // 画像をトリミングする関数
    const cropImage = async () => {
        try {
            // トリミング範囲を計算
            const scaledWidth = imageSize.width * scale;
            const scaledHeight = imageSize.height * scale;
            
            // コンテナサイズを計算
            let containerWidth, containerHeight;
            if (aspectMode === '1:1') {
                containerWidth = SCREEN_WIDTH;
                containerHeight = SCREEN_WIDTH;
            } else if (aspectMode === '4:3') {
                containerWidth = SCREEN_WIDTH;
                containerHeight = SCREEN_WIDTH * 0.75;
            } else if (aspectMode === '3:4') {
                containerWidth = SCREEN_WIDTH * 0.75;
                containerHeight = SCREEN_WIDTH;
            }
            
            // 元画像でのトリミング領域を計算
            const originX = ((scaledWidth - containerWidth) / 2 - panPosition.x) / scale;
            const originY = ((scaledHeight - containerHeight) / 2 - panPosition.y) / scale;
            const cropWidth = containerWidth / scale;
            const cropHeight = containerHeight / scale;
            
            // トリミング実行
            const manipResult = await ImageManipulator.manipulateAsync(
                selectedImage,
                [
                    {
                        crop: {
                            originX: Math.max(0, originX),
                            originY: Math.max(0, originY),
                            width: Math.min(cropWidth, imageSize.width),
                            height: Math.min(cropHeight, imageSize.height)
                        }
                    }
                ],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            return manipResult.uri;
        } catch (error) {
            console.error('Failed to crop image:', error);
            return selectedImage; // エラー時は元画像を返す
        }
    };

    // 作成・更新ボタン
    const handlePost = async () => {
        if (!selectedImage) {
            Alert.alert('エラー', '写真を選択してください');
            return;
        }
        
        if (!dateLogged) {
            Alert.alert(t('error'), t('dateRequired'));
            return;
        }

        setLoading(true);
        try {
            // 画像をトリミング
            const croppedImageUri = await cropImage();
            
            const recordData = { 
                title,
                description, 
                date_logged: dateLogged.toISOString().split('T')[0], 
                imageUri: croppedImageUri, // トリミング済み画像を使用
                category_id: selectedCategoryId,
                aspect_ratio: aspectMode
            };

            if (isEditMode) {
                await updateRecord(editRecord.id, recordData);
                Alert.alert(t('success'), t('recordUpdated'));
                navigation.goBack();
            } else {
                await createRecord(recordData);
                Alert.alert(t('success'), t('recordAdded'));
                navigation.navigate('Home');
            }
        } catch (error) {
            Alert.alert(
                isEditMode ? t('updateFailed') : t('createFailed'), 
                error.message
            );
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
                            keyboardVisible && { paddingBottom: 300 }
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={scrollEnabled}
                    >
                        {selectedImage ? (
                            <>
                                {/* 画像プレビュー */}
                                <View style={styles.imageWrapper} {...panResponder.panHandlers}>
                                    {(imageSize.width > 0 && imageSize.height > 0) || isEditMode ? (
                                        <Image
                                            source={{ uri: selectedImage }}
                                            style={
                                                isEditMode && (imageSize.width === 0 || imageSize.height === 0)
                                                    ? styles.editModeImage 
                                                    : [
                                                        styles.imagePreview,
                                                        {
                                                            width: imageSize.width || SCREEN_WIDTH,
                                                            height: imageSize.height || SCREEN_WIDTH,
                                                            transform: [
                                                                { translateX: panPosition.x },
                                                                { translateY: panPosition.y },
                                                                { scale: scale }
                                                            ]
                                                        }
                                                    ]
                                            }
                                            resizeMode={isEditMode && (imageSize.width === 0 || imageSize.height === 0) ? 'contain' : 'cover'}
                                        />
                                    ) : (
                                        <ActivityIndicator size="large" color="#fff" />
                                    )}
                                    
                                    {/* コントロールボタン - 画像プレビュー内 */}
                                    <View style={styles.overlayControls}>
                                        {/* 比率変更ボタン（左下）- 新規作成モードのみ */}
                                        {!isEditMode && (
                                            <TouchableOpacity
                                                style={[styles.overlayButton, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                                                onPress={toggleAspectMode}
                                            >
                                                <Ionicons name="crop" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                        
                                        {/* 画像選択ボタン（右下）- 常に表示 */}
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
                                        {categoriesLoading ? (
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                        ) : (
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                style={styles.categoryScrollView}
                                            >
                                                {categories.map(category => (
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
                                                                source={{ uri: category.icon_url.startsWith('http') 
                                                                    ? category.icon_url 
                                                                    : `http://192.168.11.12:3001${category.icon_url}` 
                                                                }} 
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
                                            </ScrollView>
                                        )}
                                    </View>

                                    {/* キャプション - フォームっぽくない */}
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
                                            numberOfLines={5}
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
        aspectRatio: 1,
        backgroundColor: '#000',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    imagePreview: {
        position: 'absolute',
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
