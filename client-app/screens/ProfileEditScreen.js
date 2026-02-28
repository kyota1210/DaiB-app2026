import React, { useContext, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
            const data = await updateProfile(userToken, userName, bio, selectedFile);
            
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
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            {/* トップナビゲーションバー */}
            <View style={[styles.topNavBar, {
                backgroundColor: '#000000',
                borderBottomColor: theme.colors.border
            }]}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {t('profileSettings')}
                </Text>
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
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={[styles.scrollView, { backgroundColor: '#000000' }]}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                >
                    {/* アバター */}
                <LinearGradient
                    colors={['#667eea', '#48bb78', '#38b2ac']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarSection}
                >
                    <TouchableOpacity 
                        style={styles.avatarContainer}
                        onPress={handlePickImage}
                    >
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={50} color="#fff" />
                            </View>
                        )}
                        <View style={styles.cameraIconContainer}>
                            <Ionicons name="camera" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.avatarHint}>{t('tapToSelectPhoto')}</Text>
                </LinearGradient>

                {/* フォーム */}
                <View style={[styles.formSection, { backgroundColor: '#000000' }]}>
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
                            numberOfLines={3}
                            maxLength={100}
                        />
                    </View>
                </View>
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
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => {
                            setShowSuccessModal(false);
                            navigation.goBack();
                        }}
                    >
                        <View style={[styles.successModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.successIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                                <Ionicons name="checkmark-circle" size={48} color={theme.colors.primary} />
                            </View>
                            <Text style={[styles.successMessage, { color: theme.colors.text }]}>
                                {t('profileUpdated')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </BlurView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
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
        paddingVertical: 32,
        paddingHorizontal: 20,
        position: 'relative',
    },
    avatarContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        position: 'relative',
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#fff',
    },
    avatarPlaceholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    cameraIconContainer: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarHint: {
        fontSize: 14,
        color: '#fff',
        marginTop: 4,
    },
    formSection: {
        marginTop: 0,
        paddingHorizontal: 20,
        paddingVertical: 16,
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
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalOverlay: {
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
});

export default ProfileEditScreen;
