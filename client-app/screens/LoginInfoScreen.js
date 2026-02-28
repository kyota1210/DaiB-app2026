import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginInfoScreen = ({ navigation }) => {
    const { userInfo } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdateEmail = () => {
        // TODO: メールアドレス更新APIを呼び出す
        Alert.alert(t('confirm'), t('changeEmailConfirm'), [
            { text: t('cancel'), style: 'cancel' },
            { 
                text: t('update'), 
                onPress: () => {
                    Alert.alert(t('completed'), t('emailChanged'));
                }
            }
        ]);
    };

    const handleUpdatePassword = () => {
        if (newPassword.length < 8 || newPassword.length > 16) {
            Alert.alert(t('error'), t('passwordLengthRule'));
            return;
        }
        if (!/^[!-~]{8,16}$/.test(newPassword)) {
            Alert.alert(t('error'), t('passwordInvalidChars'));
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert(t('error'), 'パスワードが一致しません');
            return;
        }
        // TODO: パスワード更新APIを呼び出す
        Alert.alert(t('completed'), t('passwordChanged'), [
            {
                text: t('ok'),
                onPress: () => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                }
            }
        ]);
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
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('loginInfo')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={[styles.scrollView, { backgroundColor: '#000000' }]}>
                {/* メールアドレス変更 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('emailSection')}</Text>
                    <View style={[styles.card, { backgroundColor: '#000000' }]}>
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
                                    color: theme.colors.text
                                }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder={t('newEmailPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: theme.colors.primary }]}
                            onPress={handleUpdateEmail}
                        >
                            <Text style={styles.buttonText}>{t('changeEmail')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* パスワード変更 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>{t('passwordSection')}</Text>
                    <View style={[styles.card, { backgroundColor: '#000000' }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('currentPassword')}</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }]}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder={t('currentPasswordPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                secureTextEntry
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('newPassword')}</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder={t('newPasswordPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                secureTextEntry
                                maxLength={16}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>{t('confirmPassword')}</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder={t('confirmPasswordPlaceholder')}
                                placeholderTextColor={theme.colors.inactive}
                                secureTextEntry
                                maxLength={16}
                            />
                        </View>
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: theme.colors.primary }]}
                            onPress={handleUpdatePassword}
                        >
                            <Text style={styles.buttonText}>{t('changePassword')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
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
    placeholder: {
        width: 32,
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
});

export default LoginInfoScreen;
