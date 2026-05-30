import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { authContext } = useContext(AuthContext);
    const { theme } = useTheme();
    const { tDevice } = useLanguage();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(tDevice('error'), tDevice('emailPasswordRequired'));
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            Alert.alert(tDevice('error'), tDevice('invalidEmail'));
            return;
        }
        setLoading(true);
        
        const result = await authContext.signIn(email, password);
        if (!result.success) {
            Alert.alert(tDevice('loginFailed'), result.error);
        }
        // 成功した場合、AppNavigatorが自動で画面を切り替えます
        setLoading(false);
    };

    return (
        <View style={[styles.wrapper, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets={false}
            >
                <View style={styles.container}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {tDevice('login')}
                    </Text>
                    <TextInput 
                        style={[styles.input, {
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                        }]}
                        placeholder={tDevice('emailAddress')} 
                        placeholderTextColor={theme.colors.inactive}
                        value={email} 
                        onChangeText={setEmail} 
                        keyboardType="email-address" 
                        autoCapitalize="none"
                    />
                    <TextInput 
                        style={[styles.input, {
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                        }]}
                        placeholder={tDevice('password')} 
                        placeholderTextColor={theme.colors.inactive}
                        value={password} 
                        onChangeText={setPassword} 
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>
                            {loading ? tDevice('loggingIn') : tDevice('login')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.forgotPasswordLink}
                        onPress={() => navigation.navigate('ForgotPassword')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.forgotPasswordLinkText, { color: theme.colors.primary }]}>
                            {tDevice('forgotPassword')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
                        onPress={() => navigation.navigate('Signup')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                            {tDevice('goToSignup')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    container: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        paddingTop: 56,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
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
    primaryButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#ffffff',
    },
    forgotPasswordLink: {
        marginTop: 12,
        paddingVertical: 8,
    },
    forgotPasswordLinkText: {
        fontSize: 15,
        fontWeight: '500',
    },
    secondaryButton: {
        width: '100%',
        height: 50,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    secondaryButtonText: {
        fontSize: 17,
        fontWeight: '600',
    },
});