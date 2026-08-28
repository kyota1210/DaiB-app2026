import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { useFonts, Nunito_900Black } from '@expo-google-fonts/nunito';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// フォント読み込みと認証状態の確認が終わるまでネイティブスプラッシュを表示したままにする
SplashScreen.preventAutoHideAsync().catch(() => { /* すでに非表示の場合は無視 */ });
SplashScreen.setOptions({ duration: 300, fade: true });

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
  const { isLoading } = React.useContext(AuthContext);

  // 最初の描画が画面に反映されてからスプラッシュを閉じ、白画面の差し込みを防ぐ
  const onLayoutRootView = React.useCallback(() => {
    SplashScreen.hideAsync().catch(() => { /* noop */ });
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
};

// アプリ全体をNavigationContainerでラップし、認証コンテキスト（状態管理）を設定するシンプルな役割
export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_900Black });

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
