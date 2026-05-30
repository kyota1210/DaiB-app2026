import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function SignupScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);

    const { authContext } = useContext(AuthContext);
    const { theme } = useTheme();
    const { tDevice } = useLanguage();

    const handleSignup = async () => {
        if (!email || !password) {
            Alert.alert(tDevice('error'), tDevice('emailPasswordRequired'));
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            Alert.alert(tDevice('error'), tDevice('invalidEmail'));
            return;
        }
        if (password.length < 8 || password.length > 16) {
            Alert.alert(tDevice('error'), tDevice('passwordLengthRule'));
            return;
        }
        if (!/^[!-~]{8,16}$/.test(password)) {
            Alert.alert(tDevice('error'), tDevice('passwordInvalidChars'));
            return;
        }
        if (!displayName?.trim()) {
            Alert.alert(tDevice('error'), tDevice('userNameRequired'));
            return;
        }
        if (displayName.trim().length > 25) {
            Alert.alert(tDevice('error'), tDevice('userNameMaxLength'));
            return;
        }
        setLoading(true);

        const result = await authContext.signUp(email, displayName, password);

        if (result.success) {
            if (result.needsEmailConfirmation) {
                Alert.alert(tDevice('signupLoginSuccess'), tDevice('signupConfirmEmail'));
            } else {
                Alert.alert(tDevice('signupLoginSuccess'), tDevice('redirectToMain'));
            }
        } else {
             Alert.alert(tDevice('signupFailed'), result.error);
        }

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
                        {tDevice('newUserRegistration')}
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
                        maxLength={16}
                    />
                    <TextInput 
                        style={[styles.input, {
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                        }]}
                        placeholder={tDevice('userName')} 
                        placeholderTextColor={theme.colors.inactive}
                        value={displayName} 
                        onChangeText={setDisplayName}
                        maxLength={25}
                    />

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSignup}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>
                            {loading ? tDevice('signingUp') : tDevice('signUp')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.termsNotice, { color: theme.colors.secondaryText }]}>
                        {tDevice('signupTermsPrefix')}
                        <Text
                            style={[styles.termsLink, { color: theme.colors.primary }]}
                            onPress={() => navigation.navigate('Terms')}
                        >
                            {tDevice('terms')}
                        </Text>
                        {tDevice('signupTermsMiddle')}
                        <Text
                            style={[styles.termsLink, { color: theme.colors.primary }]}
                            onPress={() => navigation.navigate('Privacy')}
                        >
                            {tDevice('privacy')}
                        </Text>
                        {tDevice('signupTermsSuffix')}
                    </Text>

                    <Text style={[styles.alreadyHaveAccountText, { color: theme.colors.secondaryText }]}>
                        {tDevice('alreadyHaveAccount')}
                    </Text>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                            {tDevice('backToLogin')}
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
    termsNotice: {
        width: '100%',
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'left',
        marginTop: 10,
        marginBottom: 4,
    },
    termsLink: {
        textDecorationLine: 'underline',
    },
    alreadyHaveAccountText: {
        width: '100%',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
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
