import React, { useContext, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import ResultModal from '../components/ResultModal';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '../api/user';
import { SERVER_URL } from '../config';

const ProfileEditScreen = ({ navigation }) => {
    const { userInfo, userToken, authContext } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [userName, setUserName] = useState(userInfo?.user_name || '');
    const [bio, setBio] = useState(userInfo?.bio || '');
    const [visibility, setVisibility] = useState(userInfo?.visibility === 'public' ? 'public' : 'private');
    const [avatarUri, setAvatarUri] = useState(
        userInfo?.avatar_url ? `${SERVER_URL}/${userInfo.avatar_url}` : null
    );
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const scrollViewRef = useRef(null);
    const bioInputRef = useRef(null);

    const handlePickImage = async () => {
        // パーミッションを要求
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert(t('permissionRequired'), t('photoLibraryAccess'));
            return;
        }

        // 画像を選択
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaType.IMAGE,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setAvatarUri(uri);
            
            // ファイル情報を保存（アップロード用）
            const fileName = uri.split('/').pop();
            const fileType = `image/${fileName.split('.').pop()}`;
            setSelectedFile({
                uri: uri,
                name: fileName,
                type: fileType,
            });
        }
    };

    const handleSave = async () => {
        if (!userName.trim()) {
            Alert.alert(t('error'), t('userNameRequired'));
            return;
        }
        if (userName.trim().length > 25) {
            Alert.alert(t('error'), t('userNameMaxLength'));
            return;
        }

        setIsLoading(true);
        try {
            // プロフィール更新APIを呼び出す
            const data = await updateProfile(userToken, userName, bio, selectedFile, visibility);
            
            // AuthContextのユーザー情報を更新
            authContext.updateUserInfo(data.user);
            
            // 成功モーダルを表示
            setShowSuccessModal(true);
            
            // 2秒後に自動的に閉じて戻る
            setTimeout(() => {
                setShowSuccessModal(false);
                navigation.goBack();
            }, 2000);
        } catch (error) {
            console.error(t('profileUpdateError'), error);
            Alert.alert(t('error'), error.message || t('profileUpdateFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader
                title={t('profileSettings')}
                onBack={() => navigation.goBack()}
                rightAction={
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
                                {t('save')}
                            </Text>
                        )}
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                >
                    {/* アバター */}
                <View style={[styles.avatarSection, { backgroundColor: theme.colors.background }]}>
                    <TouchableOpacity 
                        style={styles.avatarContainer}
                        onPress={handlePickImage}
                    >
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
                                <Ionicons name="person" size={32} color={theme.colors.inactive} />
                            </View>
                        )}
                        <View style={[styles.cameraIconContainer, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.avatarHint, { color: theme.colors.secondaryText }]}>{t('tapToSelectPhoto')}</Text>
                </View>

                {/* フォーム */}
                <View style={[styles.formSection, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>
                            {t('userName')}
                        </Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: theme.colors.secondaryBackground,
                                borderColor: theme.colors.border,
                                color: theme.colors.text
                            }]}
                            value={userName}
                            onChangeText={setUserName}
                            placeholder={t('userNamePlaceholder')}
                            placeholderTextColor={theme.colors.inactive}
                            maxLength={25}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>
                            {t('bio')} ({bio.length}/100)
                        </Text>
                        <TextInput
                            ref={bioInputRef}
                            style={[styles.bioInput, {
                                backgroundColor: theme.colors.secondaryBackground,
                                borderColor: theme.colors.border,
                                color: theme.colors.text
                            }]}
                            value={bio}
                            onChangeText={(text) => {
                                if (text.length <= 100) {
                                    setBio(text);
                                }
                            }}
                            onFocus={() => {
                                // キーボード表示時に自己紹介欄が見えるようにスクロール
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 300);
                            }}
                            placeholder={t('bioPlaceholder')}
                            placeholderTextColor={theme.colors.inactive}
                            multiline
                            numberOfLines={5}
                            maxLength={100}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>
                            {t('profileVisibility')}
                        </Text>
                        <View style={styles.visibilityRow}>
                            <TouchableOpacity
                                style={[
                                    styles.visibilityOption,
                                    visibility === 'public' && { backgroundColor: theme.colors.primary + '30', borderColor: theme.colors.primary }
                                ]}
                                onPress={() => setVisibility('public')}
                            >
                                <Text style={[styles.visibilityOptionText, { color: theme.colors.text }]}>{t('visibilityPublic')}</Text>
                                <Text style={[styles.visibilityHint, { color: theme.colors.secondaryText }]}>{t('visibilityPublicHint')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.visibilityOption,
                                    visibility === 'private' && { backgroundColor: theme.colors.primary + '30', borderColor: theme.colors.primary }
                                ]}
                                onPress={() => setVisibility('private')}
                            >
                                <Text style={[styles.visibilityOptionText, { color: theme.colors.text }]}>{t('visibilityPrivate')}</Text>
                                <Text style={[styles.visibilityHint, { color: theme.colors.secondaryText }]}>{t('visibilityPrivateHint')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {visibility === 'public' && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.hintText, { color: theme.colors.secondaryText }]}>{t('visibilityPublicSearchHint')}</Text>
                        </View>
                    )}
                    {visibility === 'private' && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.hintText, { color: theme.colors.secondaryText }]}>{t('searchKeyQrHint')}</Text>
                        </View>
                    )}
                </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <ResultModal
                type="success"
                visible={showSuccessModal}
                title={t('profileUpdated')}
                onClose={() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    saveButton: {
        padding: 4,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    avatarSection: {
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 6,
        paddingHorizontal: 20,
    },
    avatarContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        position: 'relative',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    avatarImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#fff',
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    cameraIconContainer: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    avatarHint: {
        fontSize: 13,
        marginTop: 2,
    },
    formSection: {
        marginTop: 0,
        paddingHorizontal: 20,
        paddingTop: 6,
        paddingBottom: 16,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
    },
    bioInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        minHeight: 140,
        textAlignVertical: 'top',
    },
    visibilityRow: {
        flexDirection: 'row',
        gap: 12,
    },
    visibilityOption: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    visibilityOptionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    visibilityHint: {
        fontSize: 12,
        marginTop: 4,
    },
    hintText: {
        fontSize: 12,
        marginTop: 6,
    },
});

export default ProfileEditScreen;
