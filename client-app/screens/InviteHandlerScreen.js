import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
    consumePendingInviteUserId,
    isInviteUserId,
    markInviteHandled,
    parseInviteUserId,
    peekPendingInviteUserId,
    setPendingInviteUserId,
} from '../utils/pendingInvite';

const leaveInvite = (navigation, userToken) => {
    if (navigation.canGoBack()) {
        navigation.goBack();
        return;
    }
    const home = userToken ? 'Main' : 'Auth';
    navigation.reset({ index: 0, routes: [{ name: home }] });
};

const InviteHandlerScreen = ({ navigation, route }) => {
    const routeUserId = route.params?.userId || route.params?.params?.userId;
    const { userToken } = useContext(AuthContext);
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [error, setError] = useState(false);

    useEffect(() => {
        const openProfile = (id) => {
            markInviteHandled(id);
            if (!userToken) {
                setPendingInviteUserId(id);
                navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                return;
            }
            consumePendingInviteUserId();
            navigation.replace('UserProfile', { userId: id, fromInvite: true });
        };

        const fromRoute = isInviteUserId(routeUserId) ? String(routeUserId).trim() : '';
        const fromPending = peekPendingInviteUserId() || '';
        const knownId = fromRoute || fromPending;
        // URL の再取得を待たない。待つと effect の再実行でキャンセルされ、読み込みのまま残る。
        if (knownId) {
            openProfile(knownId);
            return undefined;
        }

        let cancelled = false;
        (async () => {
            const fromUrl = parseInviteUserId(await Linking.getInitialURL());
            if (cancelled) return;
            if (!fromUrl) {
                setError(true);
                return;
            }
            openProfile(fromUrl);
        })();
        return () => { cancelled = true; };
    }, [routeUserId, userToken, navigation]);

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
                        onPress={() => leaveInvite(navigation, userToken)}
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
