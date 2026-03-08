import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFonts, Nunito_900Black } from '@expo-google-fonts/nunito';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ステータスバーとナビゲーションをラップするコンポーネント
const AppContent = () => {
  const { theme } = useTheme();
  
  return (
    <>
      {/* ステータスバーのスタイルをテーマに応じて変更 */}
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <AppNavigator /> 
      </NavigationContainer>
    </>
  );
};

// アプリ全体をNavigationContainerでラップし、認証コンテキスト（状態管理）を設定するシンプルな役割
export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_900Black });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <AppContent />
            </SafeAreaProvider>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}