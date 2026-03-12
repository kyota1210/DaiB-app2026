import React, { useState } from 'react';
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
import { requestPasswordReset } from '../api/auth';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const { tDevice } = useLanguage();

    const handleSend = async () => {
        if (!email?.trim()) {
            Alert.alert(tDevice('error'), tDevice('emailPasswordRequired'));
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            Alert.alert(tDevice('error'), tDevice('invalidEmail'));
            return;
        }
        setLoading(true);
        try {
            const data = await requestPasswordReset(email.trim());
            if (data.reset_token) {
                navigation.replace('ResetPassword', { token: data.reset_token });
            } else {
                Alert.alert(tDevice('completed'), data.message || tDevice('resetRequestSent'));
            }
        } catch (err) {
            Alert.alert(tDevice('error'), err.message || 'リクエストに失敗しました');
        } finally {
            setLoading(false);
        }
    };

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
                        {tDevice('forgotPasswordTitle')}
                    </Text>
                    <Text style={[styles.description, { color: theme.colors.secondaryText }]}>
                        {tDevice('forgotPasswordDescription')}
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
                        placeholder={tDevice('emailAddress')}
                        placeholderTextColor={theme.colors.inactive}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                    />
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSend}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>
                            {loading ? tDevice('sendingResetLink') : tDevice('sendResetLink')}
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
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    description: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
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
