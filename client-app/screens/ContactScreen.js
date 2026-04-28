import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import ResultModal from '../components/ResultModal';
import { submitContact } from '../api/contact';

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
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async () => {
        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await submitContact({
                name: name.trim(),
                email: email.trim(),
                subject: subject.trim(),
                message: message.trim(),
            });
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                setSubject('');
                setMessage('');
            }, 2000);
        } catch (e) {
            const code = (e && e.message) || 'submit_failed';
            const localized =
                code === 'too_many_requests'
                    ? t('contactRateLimited') || '送信が集中しています。しばらくしてから再度お試しください。'
                    : code === 'invalid_email'
                        ? t('invalidEmail') || 'メールアドレスの形式が正しくありません。'
                        : t('contactSubmitFailed') || '送信に失敗しました。時間を置いてもう一度お試しください。';
            setErrorMessage(localized);
            setShowErrorModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = name.trim() && email.trim() && subject.trim() && message.trim();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('contact')} onBack={() => navigation.goBack()} />

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
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

            <ResultModal
                type="success"
                visible={showSuccessModal}
                title="送信完了"
                message={'お問い合わせありがとうございます。\n内容を確認次第、ご連絡いたします。'}
                onClose={() => setShowSuccessModal(false)}
            />

            <ResultModal
                type="error"
                visible={showErrorModal}
                title={t('error') || 'エラー'}
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
});

export default ContactScreen;
