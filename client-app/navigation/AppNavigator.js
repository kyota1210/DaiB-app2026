import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { RecordsAndCategoriesProvider } from '../context/RecordsAndCategoriesContext';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import RecordListScreen from '../screens/RecordListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ThreadScreen from '../screens/ThreadScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import LoginInfoScreen from '../screens/LoginInfoScreen';
import FriendHubScreen from '../screens/FriendHubScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import PremiumPlanScreen from '../screens/PremiumPlanScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import LanguageSettingScreen from '../screens/LanguageSettingScreen';
import DisplaySettingsScreen from '../screens/DisplaySettingsScreen';
import PhotoPickerScreen from '../screens/PhotoPickerScreen';
import HelpScreen from '../screens/HelpScreen';
import AboutScreen from '../screens/AboutScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import ContactScreen from '../screens/ContactScreen';
import InviteHandlerScreen from '../screens/InviteHandlerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar = React.memo(({ state, navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isOnHome = state.index === 0;
  const targetRoute = isOnHome ? 'Thread' : 'Home';

  const onPress = () => {
    navigation.navigate(targetRoute);
  };

  const IconComponent = isOnHome ? Ionicons : MaterialIcons;
  const iconName = isOnHome ? 'chatbubbles' : 'home';
  const accessibilityLabel = isOnHome ? t('thread') : t('gallery');

  return (
    <View style={styles.switchButtonWrapper} pointerEvents="box-none">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onLongPress={onPress}
        activeOpacity={0.85}
        style={styles.switchButton}
      >
        <View style={styles.glassButtonInner}>
          <BlurView
            intensity={70}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.glassButtonContent}>
            <IconComponent
              name={iconName}
              size={32}
              color="#4E5F5C"
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const MainTabNavigator = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarShowLabel: false }}
    >
      <Tab.Screen name="Home" component={RecordListScreen} options={{ title: t('gallery') }} />
      <Tab.Screen name="Thread" component={ThreadScreen} options={{ title: t('thread') }} />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: t('appName'),
          headerStyle: { backgroundColor: '#E8E6E1' },
          headerTintColor: '#1c1c1e',
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: t('appName'),
          headerStyle: { backgroundColor: '#E8E6E1' },
          headerTintColor: '#1c1c1e',
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: t('appName'),
          headerStyle: { backgroundColor: '#E8E6E1' },
          headerTintColor: '#1c1c1e',
        }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          title: t('appName'),
          headerStyle: { backgroundColor: '#E8E6E1' },
          headerTintColor: '#1c1c1e',
        }}
      />
    </Stack.Navigator>
  );
};

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

  if (userToken) {
    return (
      <RecordsAndCategoriesProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
          <Stack.Screen name="MyPage" component={ProfileScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="LoginInfo" component={LoginInfoScreen} />
          <Stack.Screen name="PremiumPlan" component={PremiumPlanScreen} />
          <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
          <Stack.Screen name="LanguageSetting" component={LanguageSettingScreen} />
          <Stack.Screen name="DisplaySettings" component={DisplaySettingsScreen} />
          <Stack.Screen name="PhotoPicker" component={PhotoPickerScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="Contact" component={ContactScreen} />
          <Stack.Screen name="FriendHub" component={FriendHubScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="InviteHandler" component={InviteHandlerScreen} />
        </Stack.Navigator>
      </RecordsAndCategoriesProvider>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Screen name="InviteHandler" component={InviteHandlerScreen} />
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
  switchButtonWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 24,
    right: 20,
    left: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  switchButton: {
    width: 64,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  glassButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  glassButtonContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
