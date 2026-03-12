import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Alert,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { resetPassword } from '../api/auth';

export default function ResetPasswordScreen({ navigation, route }) {
    const token = route?.params?.token || '';
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const { tDevice } = useLanguage();

    useEffect(() => {
        if (!token) {
            Alert.alert(tDevice('error'), tDevice('resetTokenMissing'), [
                { text: tDevice('ok'), onPress: () => navigation.replace('Login') },
            ]);
        }
    }, [token, navigation, tDevice]);

    const handleSubmit = async () => {
        if (!token) return;
        if (!newPassword || !confirmPassword) {
            Alert.alert(tDevice('error'), tDevice('emailPasswordRequired'));
            return;
        }
        if (newPassword.length < 8 || newPassword.length > 16) {
            Alert.alert(tDevice('error'), tDevice('passwordLengthRule'));
            return;
        }
        if (!/^[!-~]{8,16}$/.test(newPassword)) {
            Alert.alert(tDevice('error'), tDevice('passwordInvalidChars'));
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert(tDevice('error'), tDevice('passwordMismatch'));
            return;
        }
        setLoading(true);
        try {
            await resetPassword({ token, new_password: newPassword });
            Alert.alert(tDevice('completed'), tDevice('passwordChanged'), [
                { text: tDevice('ok'), onPress: () => navigation.replace('Login') },
            ]);
        } catch (err) {
            Alert.alert(tDevice('error'), err.message || 'パスワードの変更に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return null;
    }

    return (
        <KeyboardAvoidingView
            style={[styles.wrapper, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {tDevice('resetPasswordTitle')}
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                                color: theme.colors.text,
                            },
                        ]}
                        placeholder={tDevice('newPassword')}
                        placeholderTextColor={theme.colors.inactive}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        editable={!loading}
                    />
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                                color: theme.colors.text,
                            },
                        ]}
                        placeholder={tDevice('newPasswordConfirm')}
                        placeholderTextColor={theme.colors.inactive}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        editable={!loading}
                    />
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>
                            {loading ? tDevice('changingPassword') : tDevice('setNewPassword')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                            {tDevice('backToLogin')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 20, paddingTop: 24 },
    container: { alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 16,
        fontSize: 16,
    },
    primaryButton: {
        width: '100%',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    primaryButtonText: { fontSize: 17, fontWeight: '600', color: '#ffffff' },
    secondaryButton: {
        width: '100%',
        height: 50,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    secondaryButtonText: { fontSize: 17, fontWeight: '600' },
});
