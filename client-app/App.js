import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useFonts, Nunito_900Black } from '@expo-google-fonts/nunito';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// フォント読み込みと認証状態の確認が終わるまでネイティブスプラッシュを表示したままにする。
// 閉じる直前の拡大は JS 側で行うため、ネイティブ側のフェードは使わない。
SplashScreen.preventAutoHideAsync().catch(() => { /* すでに非表示の場合は無視 */ });
SplashScreen.setOptions({ duration: 0, fade: false });

// app.json の expo-splash-screen と揃える。ずれると切替の瞬間に位置や色が飛ぶ。
const SPLASH_BACKGROUND = '#F9F4EF';
const SPLASH_IMAGE_WIDTH = 200;

const linking = {
  prefixes: [Linking.createURL('/'), 'daibapp://'],
  config: {
    screens: {
      InviteHandler: 'invite/:userId',
    },
  },
};

function OpeningSplash({ onFinished }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;
  const started = React.useRef(false);

  const onLayout = React.useCallback(() => {
    if (started.current) return;
    started.current = true;

    // 同じ見た目のオーバーレイが描画されてからネイティブスプラッシュを外し、拡大を始める
    requestAnimationFrame(() => {
      SplashScreen.hideAsync()
        .catch(() => { /* noop */ })
        .finally(() => {
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 8,
              duration: 700,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(280),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 420,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]).start(({ finished }) => {
            if (finished) onFinished();
          });
        });
    });
  }, [onFinished, opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={onLayout}
      style={[styles.splashOverlay, { opacity }]}
    >
      <Animated.Image
        source={require('./assets/splash-screen.png')}
        resizeMode="contain"
        style={[styles.splashImage, { transform: [{ scale }] }]}
      />
    </Animated.View>
  );
}

const AppContent = () => {
  const { theme } = useTheme();
  const { isLoading } = React.useContext(AuthContext);
  const [splashVisible, setSplashVisible] = React.useState(true);
  const hideSplash = React.useCallback(() => setSplashVisible(false), []);

  if (isLoading) {
    return null;
  }

  return (
    <View style={styles.root}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
      {splashVisible ? <OpeningSplash onFinished={hideSplash} /> : null}
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
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  splashImage: {
    width: SPLASH_IMAGE_WIDTH,
    height: SPLASH_IMAGE_WIDTH,
  },
});
