import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { getUserInfo } from '../api/auth';
import { supabase } from '../utils/supabase';
import { getAuthEmailRedirectTo, applySupabaseAuthTokensFromUrl } from '../utils/supabaseAuthRedirect';
import { setObservabilityUser, clearObservabilityUser } from '../utils/observability';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    const refreshUserFromApi = useCallback(async (accessToken) => {
        const data = await getUserInfo(accessToken);
        setUserInfo(data.user);
        setObservabilityUser(data.user);
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();
                if (initialUrl) {
                    const applied = await applySupabaseAuthTokensFromUrl(initialUrl);
                    if (applied.error) {
                        console.error('認証リンク処理エラー:', applied.error);
                    }
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    setUserToken(session.access_token);
                    try {
                        await refreshUserFromApi(session.access_token);
                    } catch (error) {
                        console.error('ユーザー情報取得エラー:', error);
                        await supabase.auth.signOut();
                        setUserToken(null);
                        setUserInfo(null);
                    }
                }
            } catch (e) {
                console.error('セッション読み込みエラー', e);
            } finally {
                setIsLoading(false);
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'INITIAL_SESSION') {
                return;
            }
            if (session?.access_token) {
                setUserToken(session.access_token);
                try {
                    await refreshUserFromApi(session.access_token);
                } catch (error) {
                    console.error('ユーザー情報取得エラー:', error);
                    await supabase.auth.signOut();
                    setUserToken(null);
                    setUserInfo(null);
                }
            } else {
                setUserToken(null);
                setUserInfo(null);
                clearObservabilityUser();
            }
        });

        const urlSub = Linking.addEventListener('url', async ({ url }) => {
            const applied = await applySupabaseAuthTokensFromUrl(url);
            if (applied.error) {
                console.error('認証リンク処理エラー:', applied.error);
            }
        });

        return () => {
            subscription.unsubscribe();
            urlSub.remove();
        };
    }, [refreshUserFromApi]);

    const authContext = useMemo(() => ({
        signIn: async (email, password) => {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: String(email).trim(),
                    password,
                });
                if (error) {
                    return { success: false, error: error.message };
                }
                const token = data.session?.access_token;
                if (!token) {
                    return { success: false, error: 'セッションを取得できませんでした。' };
                }
                setUserToken(token);
                const info = await getUserInfo(token);
                setUserInfo(info.user);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        signUp: async (email, user_name, password) => {
            try {
                const { data, error } = await supabase.auth.signUp({
                    email: String(email).trim(),
                    password,
                    options: {
                        emailRedirectTo: getAuthEmailRedirectTo(),
                        data: { user_name: String(user_name).trim() },
                    },
                });
                if (error) {
                    return { success: false, error: error.message };
                }
                if (data.session?.access_token) {
                    const token = data.session.access_token;
                    setUserToken(token);
                    const info = await getUserInfo(token);
                    setUserInfo(info.user);
                    return { success: true };
                }
                return { success: true, needsEmailConfirmation: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        signOut: async () => {
            try {
                await supabase.auth.signOut();
                setUserToken(null);
                setUserInfo(null);
                clearObservabilityUser();
            } catch (e) {
                console.error('ログアウトエラー', e);
            }
        },

        updateUserInfo: (newUserInfo) => {
            setUserInfo(newUserInfo);
        },
    }), []);

    const value = useMemo(() => ({
        authContext,
        isLoading,
        userToken,
        userInfo,
    }), [authContext, isLoading, userToken, userInfo]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
