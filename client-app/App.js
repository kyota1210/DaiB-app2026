import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFonts, Nunito_900Black } from '@expo-google-fonts/nunito';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const linking = {
  prefixes: [Linking.createURL('/'), 'daibapp://'],
  config: {
    screens: {
      InviteHandler: 'invite/:userId',
    },
  },
};

const AppContent = () => {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
};

// アプリ全体をNavigationContainerでラップし、認証コンテキスト（状態管理）を設定するシンプルな役割
export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_900Black });

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    // Platform-specific API keys
    const iosApiKey = 'test_LVKxEWEHqlrZRRvKexKmWNHXcdI';
    const androidApiKey = 'test_LVKxEWEHqlrZRRvKexKmWNHXcdI';

    if (Platform.OS === 'ios') {
       Purchases.configure({apiKey: iosApiKey});
    } else if (Platform.OS === 'android') {
       Purchases.configure({apiKey: androidApiKey});
    }
  }, []);

  React.useEffect(() => {
    try {
      const { initObservability } = require('./utils/observability');
      initObservability?.();
    } catch (_) { /* noop */ }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <AuthProvider>
        <SubscriptionProvider>
          <LanguageProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <AppContent />
              </SafeAreaProvider>
            </ThemeProvider>
          </LanguageProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
