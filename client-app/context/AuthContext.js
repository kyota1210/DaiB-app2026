import React, { createContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { getUserInfo } from '../api/auth';
import { supabase } from '../utils/supabase';
import { getAuthEmailRedirectTo, applySupabaseAuthTokensFromUrl, isPasswordRecoveryUrl } from '../utils/supabaseAuthRedirect';
import { setObservabilityUser, clearObservabilityUser } from '../utils/observability';
import { purchasesConfigure, purchasesLogIn, purchasesLogOut } from '../utils/purchases';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    // Ref でパスワードリカバリー中かを管理。onAuthStateChange の非同期クロージャから参照するため ref を使用。
    const isPasswordRecoveryRef = useRef(false);

    const refreshUserFromApi = useCallback(async (accessToken) => {
        const data = await getUserInfo(accessToken);
        setUserInfo(data.user);
        setObservabilityUser(data.user);
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                await purchasesConfigure();

                const initialUrl = await Linking.getInitialURL();

                if (initialUrl) {
                    if (isPasswordRecoveryUrl(initialUrl)) {
                        // リカバリーURL検出: onAuthStateChange より先に ref と state をセット。
                        // detectSessionInUrl:false では PASSWORD_RECOVERY イベントが発火しないため
                        // URL から直接判定して setIsPasswordRecovery を呼ぶ。
                        isPasswordRecoveryRef.current = true;
                        setIsPasswordRecovery(true);
                    }
                    const applied = await applySupabaseAuthTokensFromUrl(initialUrl);
                    if (applied.error) {
                        console.error('認証リンク処理エラー:', applied.error);
                        // リカバリーフロー中であればリセット
                        if (isPasswordRecoveryRef.current) {
                            isPasswordRecoveryRef.current = false;
                            setIsPasswordRecovery(false);
                        }
                        // エラーの種類に関わらず常にアラートを表示
                        Alert.alert(
                            'リンクが無効です',
                            'パスワードリセットリンクの有効期限が切れているか、無効です。再度リセットメールを送信してください。'
                        );
                    }
                }

                // リカバリーリンク経由の起動時は通常のセッション初期化をスキップ。
                // onAuthStateChange の SIGNED_IN が来ても ref でブロックする。
                if (!isPasswordRecoveryRef.current) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        setUserToken(session.access_token);
                        if (session?.user?.id) {
                            await purchasesLogIn(session.user.id);
                        }
                        try {
                            await refreshUserFromApi(session.access_token);
                        } catch (error) {
                            console.error('ユーザー情報取得エラー:', error);
                            await supabase.auth.signOut();
                            setUserToken(null);
                            setUserInfo(null);
                            await purchasesLogOut();
                        }
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
            // PASSWORD_RECOVERY は detectSessionInUrl:false では通常発火しないが念のため対応。
            if (event === 'PASSWORD_RECOVERY') {
                isPasswordRecoveryRef.current = true;
                setIsPasswordRecovery(true);
                return;
            }
            // リカバリーフロー中の SIGNED_IN / USER_UPDATED はスキップ。
            // setSession() が SIGNED_IN を発火させても Main 画面に遷移させない。
            if (isPasswordRecoveryRef.current) {
                return;
            }
            await purchasesConfigure();
            if (session?.access_token) {
                setUserToken(session.access_token);
                if (session?.user?.id) {
                    await purchasesLogIn(session.user.id);
                }
                try {
                    await refreshUserFromApi(session.access_token);
                } catch (error) {
                    console.error('ユーザー情報取得エラー:', error);
                    await supabase.auth.signOut();
                    setUserToken(null);
                    setUserInfo(null);
                    await purchasesLogOut();
                }
                // ログイン時のセキュリティ通知メールは廃止
            } else {
                setUserToken(null);
                setUserInfo(null);
                clearObservabilityUser();
                await purchasesLogOut();
            }
        });

        const urlSub = Linking.addEventListener('url', async ({ url }) => {
            if (isPasswordRecoveryUrl(url)) {
                isPasswordRecoveryRef.current = true;
                setIsPasswordRecovery(true);
            }
            const applied = await applySupabaseAuthTokensFromUrl(url);
            if (applied.error) {
                console.error('認証リンク処理エラー:', applied.error);
                // リカバリーフロー中であればリセット
                if (isPasswordRecoveryRef.current) {
                    isPasswordRecoveryRef.current = false;
                    setIsPasswordRecovery(false);
                }
                // エラーの種類に関わらず常にアラートを表示
                Alert.alert(
                    'リンクが無効です',
                    'パスワードリセットリンクの有効期限が切れているか、無効です。再度リセットメールを送信してください。'
                );
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
                if (data.session?.user?.id) {
                    await purchasesLogIn(data.session.user.id);
                }
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
                    if (data.session?.user?.id) {
                        await purchasesLogIn(data.session.user.id);
                    }
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

        clearPasswordRecovery: () => {
            isPasswordRecoveryRef.current = false;
            setIsPasswordRecovery(false);
            // リカバリーセッションをクリアしてログイン画面へ戻す
            supabase.auth.signOut().catch((e) => console.error('リカバリーサインアウトエラー', e));
        },
    }), []);

    const value = useMemo(() => ({
        authContext,
        isLoading,
        userToken,
        userInfo,
        isPasswordRecovery,
    }), [authContext, isLoading, userToken, userInfo, isPasswordRecovery]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
