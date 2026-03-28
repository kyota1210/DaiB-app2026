import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
const InviteHandlerScreen = ({ navigation, route }) => {
    const userId = route.params?.userId;
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [error, setError] = useState(false);

    useEffect(() => {
        const id = parseInt(userId, 10);
        if (!id || Number.isNaN(id) || !userToken) {
            setError(true);
            return;
        }
        navigation.replace('UserProfile', { userId: id });
    }, [userId, userToken]);

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.center}>
                    <Ionicons name="person-remove-outline" size={48} color={theme.colors.inactive} />
                    <Text style={[styles.errorText, { color: theme.colors.text }]}>
                        {t('inviteUserNotFound')}
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.buttonText}>{t('back')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.secondaryText }]}>
                    {t('inviteLoading')}
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    loadingText: { marginTop: 16, fontSize: 15 },
    errorText: { marginTop: 16, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    button: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default InviteHandlerScreen;
