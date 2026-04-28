import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
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
import { useSubscription } from '../context/SubscriptionContext';
import { showInterstitialIfReady } from '../utils/interstitialAd';
import { useFeatureGate } from '../hooks/useFeatureGate';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function PhotoPickerScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { isPremium } = useSubscription();
    
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
    const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => {
        if (editRecord?.category_ids) {
            // サーバーから返るカンマ区切り文字列 or 配列に対応
            const raw = editRecord.category_ids;
            if (Array.isArray(raw)) return raw.map(Number);
            return String(raw).split(',').map(Number).filter(n => !isNaN(n) && n > 0);
        }
        if (editRecord?.category_id) return [editRecord.category_id];
        return [];
    });
    const [showInTimeline, setShowInTimeline] = useState(
        editRecord
            ? !(
                  editRecord.show_in_timeline === false ||
                  editRecord.show_in_timeline === 0 ||
                  editRecord.show_in_timeline === '0'
              )
            : true
    );
    const [timelineDropdownOpen, setTimelineDropdownOpen] = useState(false);
    const [timelineDropdownAnchor, setTimelineDropdownAnchor] = useState(null);
    const timelineSelectWrapRef = useRef(null);
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

    const closeTimelineDropdown = useCallback(() => {
        setTimelineDropdownOpen(false);
        setTimelineDropdownAnchor(null);
    }, []);

    const toggleTimelineDropdown = useCallback(() => {
        if (timelineDropdownOpen) {
            closeTimelineDropdown();
            return;
        }
        timelineSelectWrapRef.current?.measureInWindow((x, y, width, height) => {
            setTimelineDropdownAnchor({ x, y, width, height });
            setTimelineDropdownOpen(true);
        });
    }, [timelineDropdownOpen, closeTimelineDropdown]);
    
    const { createRecord, updateRecord } = useRecordsApi();
    const { categories, loadCategories, loadingCategories, loadRecords, records } = useRecordsAndCategories();
    const { canCreateMorePosts, getMonthlyPostLimit } = useFeatureGate();
    
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

        // 無料プラン: 月間投稿上限チェック（編集時はスキップ）
        if (!isEditMode) {
            const now = new Date();
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const currentMonthCount = (records || []).filter((r) =>
                typeof r?.date_logged === 'string' && r.date_logged.startsWith(ym),
            ).length;
            if (!canCreateMorePosts(currentMonthCount)) {
                Alert.alert(
                    t('monthlyPostLimitReached') || '今月の投稿上限に達しました',
                    (t('monthlyPostLimitMessage') || '無料プランは月{{limit}}件までです。プレミアムにアップグレードすると無制限で投稿できます。')
                        .replace('{{limit}}', String(getMonthlyPostLimit())),
                    [
                        { text: t('cancel'), style: 'cancel' },
                        {
                            text: t('upgradeToPremium'),
                            onPress: () => navigation.navigate('PremiumPlan'),
                        },
                    ],
                );
                return;
            }
        }

        setLoading(true);
        try {
            const y = dateLogged.getFullYear();
            const m = String(dateLogged.getMonth() + 1).padStart(2, '0');
            const d = String(dateLogged.getDate()).padStart(2, '0');
            const recordData = { 
                title,
                description, 
                date_logged: `${y}-${m}-${d}`, 
                category_ids: selectedCategoryIds,
            };
            if (!isEditMode) {
                recordData.show_in_timeline = showInTimeline;
            }
            // New post: always send local image URI. Edit: only when user picked a new image.
            if (!isEditMode) {
                recordData.imageUri = selectedImage;
            } else if (isNewImageSelected) {
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
                showInterstitialIfReady({ isPremium }).catch(() => { /* noop */ });
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }, 2000);
            }
        } catch (error) {
            const isBlocked =
                error?.code === 'IMAGE_BLOCKED' ||
                /image_blocked_by_moderation|avatar_blocked_by_moderation/.test(String(error?.message || ''));
            if (isBlocked) {
                setErrorMessage(t('imageBlockedByModeration') || 'この画像は利用規約に違反する可能性があるため、投稿できません。別の画像を選択してください。');
            } else {
                setErrorMessage(error.message || (isEditMode ? t('updateFailed') : t('createFailed')));
            }
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
                        onScrollBeginDrag={closeTimelineDropdown}
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
                                                {categories.filter(c => c.id !== 'all').map(category => {
                                                    const isSelected = selectedCategoryIds.includes(category.id);
                                                    return (
                                                        <TouchableOpacity
                                                            key={category.id}
                                                            style={[
                                                                styles.categoryItem,
                                                                { 
                                                                    backgroundColor: isSelected
                                                                        ? theme.colors.primary 
                                                                        : theme.colors.secondaryBackground,
                                                                    borderColor: isSelected
                                                                        ? theme.colors.primary
                                                                        : theme.colors.border
                                                                }
                                                            ]}
                                                            onPress={() => {
                                                                setSelectedCategoryIds(prev =>
                                                                    prev.includes(category.id)
                                                                        ? prev.filter(id => id !== category.id)
                                                                        : [...prev, category.id]
                                                                );
                                                            }}
                                                        >
                                                            {category.icon_url && (
                                                                <Image 
                                                                    source={{ uri: getImageUrl(category.icon_url) }} 
                                                                    style={styles.categoryIcon}
                                                                />
                                                            )}
                                                            <Text style={[
                                                                styles.categoryName, 
                                                                { color: isSelected ? '#fff' : theme.colors.text }
                                                            ]}>
                                                                {category.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </RNScrollView>
                                        )}
                                    </View>

                                    {/* スレッドに表示する（新規作成時のみ） */}
                                    {!isEditMode && (
                                        <View style={styles.inputGroup}>
                                            <Text style={[styles.label, { color: theme.colors.secondaryText }]}>
                                                {t('threadDisplaySetting')}
                                            </Text>
                                            <View ref={timelineSelectWrapRef} collapsable={false}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.timelineSelectRow,
                                                        {
                                                            backgroundColor: theme.colors.secondaryBackground,
                                                            borderColor: theme.colors.border,
                                                        },
                                                    ]}
                                                    onPress={toggleTimelineDropdown}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={[styles.timelineSelectValue, { color: theme.colors.text }]}
                                                        numberOfLines={1}
                                                    >
                                                        {showInTimeline ? t('showInTimelineYes') : t('showInTimelineNo')}
                                                    </Text>
                                                    <Ionicons
                                                        name={timelineDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                                        size={20}
                                                        color={theme.colors.secondaryText}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                            <Modal
                                                visible={timelineDropdownOpen && !!timelineDropdownAnchor}
                                                transparent
                                                animationType="fade"
                                                onRequestClose={closeTimelineDropdown}
                                                statusBarTranslucent
                                            >
                                                <View style={styles.timelineDropdownModalRoot} pointerEvents="box-none">
                                                    <TouchableOpacity
                                                        style={StyleSheet.absoluteFill}
                                                        activeOpacity={1}
                                                        onPress={closeTimelineDropdown}
                                                    />
                                                    {timelineDropdownAnchor ? (
                                                        <View
                                                            style={[
                                                                styles.timelineDropdownPanel,
                                                                {
                                                                    top: timelineDropdownAnchor.y + timelineDropdownAnchor.height + 2,
                                                                    left: timelineDropdownAnchor.x,
                                                                    width: timelineDropdownAnchor.width,
                                                                    backgroundColor: theme.colors.card,
                                                                    borderColor: theme.colors.border,
                                                                },
                                                            ]}
                                                            onStartShouldSetResponder={() => true}
                                                        >
                                                            <TouchableOpacity
                                                                style={[
                                                                    styles.timelineDropdownOption,
                                                                    styles.timelineDropdownOptionDivider,
                                                                    { borderBottomColor: theme.colors.border },
                                                                ]}
                                                                onPress={() => {
                                                                    setShowInTimeline(true);
                                                                    closeTimelineDropdown();
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <Text style={[styles.timelineDropdownOptionLabel, { color: theme.colors.text }]}>
                                                                    {t('showInTimelineYes')}
                                                                </Text>
                                                                {showInTimeline ? (
                                                                    <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                                                                ) : (
                                                                    <View style={styles.timelineDropdownCheckPlaceholder} />
                                                                )}
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={styles.timelineDropdownOption}
                                                                onPress={() => {
                                                                    setShowInTimeline(false);
                                                                    closeTimelineDropdown();
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <Text style={[styles.timelineDropdownOptionLabel, { color: theme.colors.text }]}>
                                                                    {t('showInTimelineNo')}
                                                                </Text>
                                                                {!showInTimeline ? (
                                                                    <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                                                                ) : (
                                                                    <View style={styles.timelineDropdownCheckPlaceholder} />
                                                                )}
                                                            </TouchableOpacity>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </Modal>
                                        </View>
                                    )}

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

                {/* 成功モーダル（シンプル表示） */}
                <Modal
                    visible={showSuccessModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowSuccessModal(false)}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlaySimple, { paddingTop: insets.top + 12 }]}
                        activeOpacity={1}
                        onPress={() => setShowSuccessModal(false)}
                    >
                        <View style={[styles.successModalContent, { backgroundColor: theme.colors.card }]}>
                            <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary} style={styles.successIcon} />
                            <Text style={[styles.successMessage, { color: theme.colors.text }]}>
                                {isEditMode ? t('recordUpdated') : t('recordAdded')}
                            </Text>
                        </View>
                    </TouchableOpacity>
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
    timelineSelectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 12,
    },
    timelineSelectValue: {
        flex: 1,
        fontSize: 16,
        marginRight: 8,
    },
    timelineDropdownModalRoot: {
        flex: 1,
    },
    timelineDropdownPanel: {
        position: 'absolute',
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 12,
    },
    timelineDropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    timelineDropdownOptionDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    timelineDropdownOptionLabel: {
        flex: 1,
        fontSize: 16,
        marginRight: 12,
    },
    timelineDropdownCheckPlaceholder: {
        width: 22,
        height: 22,
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
    modalOverlaySimple: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
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
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        minWidth: 300,
        maxWidth: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    successIcon: {
        marginRight: 10,
    },
    successMessage: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        flexShrink: 0,
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
