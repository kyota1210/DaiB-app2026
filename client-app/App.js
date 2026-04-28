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

const linking = {
  prefixes: [Linking.createURL('/'), 'daibapp://'],
  config: {
    screens: {
      InviteHandler: 'invite/:userId',
    },
  },
};

// ステータスバーとナビゲーションをラップするコンポーネント
const AppContent = () => {
  const { theme } = useTheme();
  
  return (
    <>
      {/* ステータスバーのスタイルをテーマに応じて変更 */}
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

  React.useEffect(() => {
    // AdMob 初期化（ATT / UMP CMP を内部で要求）→ それを踏まえて Sentry/Analytics を初期化。
    // Expo Go ではネイティブモジュールが無いため失敗する → 握り潰す。
    (async () => {
      let trackingAuthorized = false;
      try {
        const { initAds, isTrackingAuthorized } = require('./utils/ads');
        await initAds?.();
        trackingAuthorized = !!isTrackingAuthorized?.();
      } catch (_) { /* Expo Go */ }
      try {
        const { initObservability } = require('./utils/observability');
        initObservability?.({ trackingAuthorized });
      } catch (_) { /* noop */ }
    })();
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