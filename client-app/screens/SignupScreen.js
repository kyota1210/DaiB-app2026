import React, { useState, useContext, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, TouchableOpacity, Image, KeyboardAvoidingView, ScrollView, Platform, Keyboard } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function SignupScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const scrollViewRef = useRef(null);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

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
        <KeyboardAvoidingView
            style={[styles.wrapper, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + keyboardHeight }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <Image
                        source={require('../assets/icon_clear.png')}
                        style={styles.appIcon}
                        resizeMode="contain"
                    />
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
                        onFocus={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
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
                        onFocus={() => scrollViewRef.current?.scrollTo({ y: 220, animated: true })}
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
                        onFocus={() => scrollViewRef.current?.scrollTo({ y: 380, animated: true })}
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
        </KeyboardAvoidingView>
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
    appIcon: {
        width: 170,
        height: 170,
        marginBottom: 24,
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
