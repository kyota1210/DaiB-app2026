import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { RecordsAndCategoriesProvider } from '../context/RecordsAndCategoriesContext';

// 画面インポート
import LoginScreen from '../screens/LoginScreen'; 
import SignupScreen from '../screens/SignupScreen';
import RecordListScreen from '../screens/RecordListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ThreadScreen from '../screens/ThreadScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import LoginInfoScreen from '../screens/LoginInfoScreen';
import PremiumPlanScreen from '../screens/PremiumPlanScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import LanguageSettingScreen from '../screens/LanguageSettingScreen';
import PhotoPickerScreen from '../screens/PhotoPickerScreen';
import HelpScreen from '../screens/HelpScreen';
import AboutScreen from '../screens/AboutScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import ContactScreen from '../screens/ContactScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ------------------------------------------------
// メインのタブナビゲーション（ログイン後の画面）
// ------------------------------------------------
const MainTabNavigator = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Liquid glassデザインのカスタムタブバー
  const CustomTabBar = (props) => {
    return (
      <BlurView
        intensity={80}
        tint="dark"
        style={styles.blurContainer}
      >
        <View style={styles.tabBarContainer}>
          {props.state.routes.map((route, index) => {
            const { options } = props.descriptors[route.key];
            const isFocused = props.state.index === index;
            const color = isFocused ? '#fff' : theme.colors.inactive;

            const onPress = () => {
              const event = props.navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                props.navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              props.navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            let iconName;
            let IconComponent;
            if (route.name === 'Home') {
              IconComponent = MaterialIcons;
              iconName = 'home';
            } else if (route.name === 'Thread') {
              IconComponent = Ionicons;
              iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabBarButton}
              >
                {isFocused ? (
                  <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.iconGlassContainer}
                  >
                    {IconComponent && (
                      <IconComponent name={iconName} size={30} color={color} />
                    )}
                  </BlurView>
                ) : (
                  IconComponent && (
                    <IconComponent name={iconName} size={30} color={color} />
                  )
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    );
  };
  
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={RecordListScreen} 
        options={{ title: t('gallery') }} 
      />
      <Tab.Screen 
        name="Thread" 
        component={ThreadScreen} 
        options={{ title: t('thread') }}
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
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: t('appName'),
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: t('appName'),
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#ffffff',
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
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
  
  // ログイン後は記録・カテゴリのキャッシュを提供。Navigator の直接の子は Screen のみのため Provider は外側でラップ
  if (userToken) {
    return (
      <RecordsAndCategoriesProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="RecordDetail"
            component={RecordDetailScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="MyPage"
            component={ProfileScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="ProfileEdit"
            component={ProfileEditScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="LoginInfo"
            component={LoginInfoScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="PremiumPlan"
            component={PremiumPlanScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="CategoryManagement"
            component={CategoryManagementScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="LanguageSetting"
            component={LanguageSettingScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="PhotoPicker"
            component={PhotoPickerScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="Help"
            component={HelpScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen
            name="Contact"
            component={ContactScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
        </Stack.Navigator>
      </RecordsAndCategoriesProvider>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthStack} />
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
  blurContainer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 64,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  tabBarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlassContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default AppNavigator;