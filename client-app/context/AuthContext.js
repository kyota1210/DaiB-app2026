import React, { createContext, useState, useEffect, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login, signup, getUserInfo } from '../api/auth'; 

export const AuthContext = createContext();

const TOKEN_KEY = 'userToken';

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        const bootstrapAsync = async () => {
            let token;
            try {
                token = await SecureStore.getItemAsync(TOKEN_KEY);
                
                if (token) {
                    try {
                        const data = await getUserInfo(token);
                        setUserInfo(data.user);
                    } catch (error) {
                        console.error('ユーザー情報取得エラー:', error);
                        await SecureStore.deleteItemAsync(TOKEN_KEY);
                        token = null;
                    }
                }
            } catch (e) {
                console.error('トークン読み込みエラー', e);
            }
            setUserToken(token);
            setIsLoading(false);
        };
        bootstrapAsync();
    }, []);

    const authContext = useMemo(() => ({
        signIn: async (email, password) => {
            try {
                const data = await login({ email, password });
                await SecureStore.setItemAsync(TOKEN_KEY, data.token);
                setUserToken(data.token);
                setUserInfo(data.user);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        signUp: async (email, user_name, password) => {
            try {
                await signup({ email, user_name, password });
                return await authContext.signIn(email, password); 
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        signOut: async () => {
            try {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                setUserToken(null);
                setUserInfo(null);
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
