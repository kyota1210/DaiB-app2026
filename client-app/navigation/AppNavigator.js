import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// 画面インポート
import LoginScreen from '../screens/LoginScreen'; 
import SignupScreen from '../screens/SignupScreen';
import RecordListScreen from '../screens/RecordListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ThreadScreen from '../screens/ThreadScreen';
import InsightScreen from '../screens/InsightScreen';
// ↓ 追加
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import LoginInfoScreen from '../screens/LoginInfoScreen';
import PremiumPlanScreen from '../screens/PremiumPlanScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import ThemeSettingScreen from '../screens/ThemeSettingScreen';
import LanguageSettingScreen from '../screens/LanguageSettingScreen';
import PhotoPickerScreen from '../screens/PhotoPickerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ------------------------------------------------
// メインのタブナビゲーション（ログイン後の画面）
// ------------------------------------------------
const MainTabNavigator = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === 'Home') {
            // 「ホーム」→「ギャラリー」
            iconName = focused ? 'images' : 'images-outline';
          } else if (route.name === 'Create') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Thread') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'MyPage') {
            // 「マイページ」→「設定」
            iconName = focused ? 'settings' : 'settings-outline';
          }

          // アイコンサイズを少し大きく（デフォルト24→30）
          return <Ionicons name={iconName} size={30} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary, // アクティブな色
        tabBarInactiveTintColor: theme.colors.inactive,  // 非アクティブな色
        headerShown: false,              // タブ画面の上部タイトルバーを非表示
        tabBarShowLabel: false,          // 下部メニュー名（ラベル）を非表示（アイコンのみ）
        tabBarStyle: {
          backgroundColor: theme.colors.card, // タブバーの背景色
          borderTopColor: theme.colors.border, // 上部ボーダー色
          borderTopWidth: 1,
          paddingTop: 10,                // 上部余白を追加してアイコンを中央に
          paddingBottom: 10,             // 下部余白を追加してアイコンを中央に
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={RecordListScreen} 
        options={{ title: t('gallery') }} 
      />
      <Tab.Screen 
        name="Create" 
        component={PhotoPickerScreen} 
        options={{ title: t('create') }}
      />
      <Tab.Screen 
        name="Thread" 
        component={ThreadScreen} 
        options={{ title: t('thread') }}
      />
      <Tab.Screen 
        name="MyPage" 
        component={ProfileScreen} 
        options={{ title: t('settings') }} 
      />
    </Tab.Navigator>
  );
};

// ------------------------------------------------
// 未認証ユーザー向けの画面群
// ------------------------------------------------
const AuthStack = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('login') }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: t('signup') }} />
    </Stack.Navigator>
  );
};

// ------------------------------------------------
// ルートナビゲーター
// ------------------------------------------------
const AppNavigator = () => {
  const { isLoading, userToken } = React.useContext(AuthContext);
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.secondaryText }]}>{t('checkingAuth')}</Text>
      </View>
    );
  }
  
  return (
    // Stack.Navigator で全体を包み、認証状態によって中身を切り替える
    // ログイン後は TabNavigator を表示する
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          {/* ↓ 追加: 詳細画面 */}
          <Stack.Screen 
            name="RecordDetail" 
            component={RecordDetailScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          {/* ↓ 追加: インサイト画面 */}
          <Stack.Screen 
            name="Insight" 
            component={InsightScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          {/* ↓ 追加: アカウント設定画面 */}
          <Stack.Screen 
            name="ProfileEdit" 
            component={ProfileEditScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen 
            name="LoginInfo" 
            component={LoginInfoScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen 
            name="PremiumPlan" 
            component={PremiumPlanScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          {/* ↓ 追加: Otium設定画面 */}
          <Stack.Screen 
            name="CategoryManagement" 
            component={CategoryManagementScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          {/* ↓ 追加: アプリ設定画面 */}
          <Stack.Screen 
            name="ThemeSetting" 
            component={ThemeSettingScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen 
            name="LanguageSetting" 
            component={LanguageSettingScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen 
            name="PhotoPicker" 
            component={PhotoPickerScreen} 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default AppNavigator;