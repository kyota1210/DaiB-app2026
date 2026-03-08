import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import ja from '../locales/ja';
import en from '../locales/en';

export const LanguageContext = createContext();

const translations = { ja, en };

const getSystemLanguage = () => {
    const systemLang = Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;
    
    const langCode = systemLang?.split(/[-_]/)[0] || 'ja';
    return langCode === 'en' ? 'en' : 'ja';
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('system');
    const [isLoading, setIsLoading] = useState(true);

    const activeLanguage = useMemo(() => {
        return language === 'system' ? getSystemLanguage() : language;
    }, [language]);

    const t = useCallback((key) => {
        return translations[activeLanguage]?.[key] || translations['ja'][key] || key;
    }, [activeLanguage]);

    const tDevice = useCallback((key) => {
        const locale = getSystemLanguage();
        return translations[locale]?.[key] || translations['ja'][key] || key;
    }, []);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('app_language');
            if (savedLanguage) {
                setLanguage(savedLanguage);
            }
        } catch (error) {
            console.error('言語設定の読み込みエラー:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const changeLanguage = useCallback(async (newLanguage) => {
        try {
            await AsyncStorage.setItem('app_language', newLanguage);
            setLanguage(newLanguage);
        } catch (error) {
            console.error('言語設定の保存エラー:', error);
        }
    }, []);

    const value = useMemo(() => ({
        language,
        activeLanguage,
        changeLanguage,
        t,
        tDevice,
        isLoading,
    }), [language, activeLanguage, changeLanguage, t, tDevice, isLoading]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
