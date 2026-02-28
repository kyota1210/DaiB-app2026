import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';

const ContactScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { userInfo } = useContext(AuthContext);
    
    const [name, setName] = useState(userInfo?.user_name || '');
    const [email, setEmail] = useState(userInfo?.email || '');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            return;
        }

        setIsSubmitting(true);
        
        // TODO: 実際のAPIエンドポイントに送信する処理を実装
        // 現在はモックとして2秒待機
        setTimeout(() => {
            setIsSubmitting(false);
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                // フォームをリセット
                setSubject('');
                setMessage('');
            }, 2000);
        }, 1000);
    };

    const isFormValid = name.trim() && email.trim() && subject.trim() && message.trim();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            {/* ヘッダー */}
            <View style={[styles.header, { 
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
                    {t('contact')}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    style={[styles.scrollView, { backgroundColor: '#000000' }]}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.content, { backgroundColor: '#000000' }]}>
                        <Text style={[styles.description, { color: theme.colors.secondaryText }]}>
                            ご質問やご意見がございましたら、以下のフォームからお気軽にお問い合わせください。
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>
                                お名前 <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="お名前を入力"
                                placeholderTextColor={theme.colors.inactive}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>
                                メールアドレス <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="メールアドレスを入力"
                                placeholderTextColor={theme.colors.inactive}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>
                                件名 <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }]}
                                value={subject}
                                onChangeText={setSubject}
                                placeholder="件名を入力"
                                placeholderTextColor={theme.colors.inactive}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>
                                お問い合わせ内容 <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.textArea, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="お問い合わせ内容を入力してください"
                                placeholderTextColor={theme.colors.inactive}
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                { backgroundColor: isFormValid ? theme.colors.primary : theme.colors.inactive },
                                !isFormValid && styles.submitButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!isFormValid || isSubmitting}
                        >
                            {isSubmitting ? (
                                <Text style={styles.submitButtonText}>送信中...</Text>
                            ) : (
                                <Text style={styles.submitButtonText}>送信</Text>
                            )}
                        </TouchableOpacity>
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
                        onPress={() => setShowSuccessModal(false)}
                    >
                        <View style={[styles.successModalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.successIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                                <Ionicons name="checkmark-circle" size={48} color={theme.colors.primary} />
                            </View>
                            <Text style={[styles.successTitle, { color: theme.colors.text }]}>
                                送信完了
                            </Text>
                            <Text style={[styles.successMessage, { color: theme.colors.secondaryText }]}>
                                お問い合わせありがとうございます。{'\n'}内容を確認次第、ご連絡いたします。
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
    header: {
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
    placeholder: {
        width: 32,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    content: {
        borderRadius: 12,
        padding: 20,
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    required: {
        color: '#FF3B30',
    },
    input: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
    },
    textArea: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        minHeight: 150,
        textAlignVertical: 'top',
    },
    submitButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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

export default ContactScreen;
