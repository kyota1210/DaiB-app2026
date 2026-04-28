import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../utils/supabase';
import { getAuthEmailRedirectTo } from '../utils/supabaseAuthRedirect';
import { deleteOwnAccount } from '../api/account';

const LoginInfoScreen = ({ navigation }) => {
    const { userInfo, authContext } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updatingEmail, setUpdatingEmail] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleUpdateEmail = () => {
        const next = String(email).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
            Alert.alert(t('error'), t('invalidEmail'));
            return;
        }
        Alert.alert(t('confirm'), t('changeEmailConfirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('update'),
                onPress: async () => {
                    setUpdatingEmail(true);
                    try {
                        const { error } = await supabase.auth.updateUser(
                            { email: next },
                            { emailRedirectTo: getAuthEmailRedirectTo() }
                        );
                        if (error) {
                            Alert.alert(t('error'), error.message);
                            return;
                        }
                        Alert.alert(t('completed'), t('emailChangeRequested'));
                        setEmail('');
                    } finally {
                        setUpdatingEmail(false);
                    }
                },
            },
        ]);
    };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 8 || newPassword.length > 16) {
            Alert.alert(t('error'), t('passwordLengthRule'));
            return;
        }
        if (!/^[!-~]{8,16}$/.test(newPassword)) {
            Alert.alert(t('error'), t('passwordInvalidChars'));
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert(t('error'), t('passwordMismatch'));
            return;
        }
        const userEmail = userInfo?.email;
        if (!userEmail) {
            Alert.alert(t('error'), t('reauthRequired'));
            return;
        }
        setUpdatingPassword(true);
        try {
            // 現パスワードで再認証（誤入力チェック）
            if (currentPassword) {
                const { error: reauthError } = await supabase.auth.signInWithPassword({
                    email: userEmail,
                    password: currentPassword,
                });
                if (reauthError) {
                    Alert.alert(t('error'), t('currentPasswordIncorrect'));
                    return;
                }
            }
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                Alert.alert(t('error'), error.message);
                return;
            }
            Alert.alert(t('completed'), t('passwordChanged'), [
                {
                    text: t('ok'),
                    onPress: () => {
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                    },
                },
            ]);
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('deleteAccount'),
            t('deleteAccountConfirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            t('deleteAccount'),
                            t('deleteAccountFinalConfirm'),
                            [
                                { text: t('cancel'), style: 'cancel' },
                                {
                                    text: t('deleteAccountConfirmAction'),
                                    style: 'destructive',
                                    onPress: async () => {
                                        setDeleting(true);
                                        try {
                                            await deleteOwnAccount();
                                            // AuthContext は auth state 変化を検知してログイン画面に戻すが、
                                            // 確実に signOut も呼んでおく
                                            try {
                                                await authContext.signOut();
                                            } catch (_) { /* ignore */ }
                                            Alert.alert(t('completed'), t('accountDeleted'));
                                        } catch (e) {
                                            Alert.alert(t('error'), e.message || t('accountDeleteFailed'));
                                        } finally {
                                            setDeleting(false);
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('loginInfo')} onBack={() => navigation.goBack()} />

            <ScrollView style={[styles.scrollView, { backgroundColor: theme.colors.background }]}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('emailSection')}</Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('currentEmail')}</Text>
                            <Text style={[styles.currentValue, { color: theme.colors.secondaryText }]}>
                                {userInfo?.email || ''}
                            </Text>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('newEmail')}</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder={t('newEmailPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!updatingEmail}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary, opacity: updatingEmail ? 0.6 : 1 }]}
                            onPress={handleUpdateEmail}
                            disabled={updatingEmail}
                        >
                            {updatingEmail
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.buttonText}>{t('changeEmail')}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('passwordSection')}</Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('currentPassword')}</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                }]}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder={t('currentPasswordPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                secureTextEntry
                                editable={!updatingPassword}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('newPassword')}</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder={t('newPasswordPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                secureTextEntry
                                maxLength={16}
                                editable={!updatingPassword}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('confirmPassword')}</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                }]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder={t('confirmPasswordPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                secureTextEntry
                                maxLength={16}
                                editable={!updatingPassword}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary, opacity: updatingPassword ? 0.6 : 1 }]}
                            onPress={handleUpdatePassword}
                            disabled={updatingPassword}
                        >
                            {updatingPassword
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.buttonText}>{t('changePassword')}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('dangerZone')}</Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.dangerDescription, { color: theme.colors.secondaryText }]}>
                            {t('deleteAccountDescription')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.dangerButton, { borderColor: '#FF3B30', opacity: deleting ? 0.6 : 1 }]}
                            onPress={handleDeleteAccount}
                            disabled={deleting}
                        >
                            {deleting
                                ? <ActivityIndicator color="#FF3B30" />
                                : (
                                    <>
                                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                        <Text style={styles.dangerButtonText}>{t('deleteAccount')}</Text>
                                    </>
                                )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    card: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    currentValue: {
        fontSize: 16,
        paddingVertical: 12,
    },
    input: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
    },
    button: {
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    dangerDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
    },
    dangerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
    },
});

export default LoginInfoScreen;
