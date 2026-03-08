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

import LoginScreen from '../screens/LoginScreen'; 
import SignupScreen from '../screens/SignupScreen';
import RecordListScreen from '../screens/RecordListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ThreadScreen from '../screens/ThreadScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import LoginInfoScreen from '../screens/LoginInfoScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import FollowListScreen from '../screens/FollowListScreen';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar = React.memo(({ state, descriptors, navigation }) => {
  const { theme } = useTheme();

  return (
    <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
      <View style={styles.tabBarContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? '#fff' : theme.colors.inactive;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
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
                <BlurView intensity={20} tint="dark" style={styles.iconGlassContainer}>
                  {IconComponent && <IconComponent name={iconName} size={30} color={color} />}
                </BlurView>
              ) : (
                IconComponent && <IconComponent name={iconName} size={30} color={color} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
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
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: t('appName'),
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerBackVisible: false,
          headerLeft: () => null,
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
          <Stack.Screen name="UserSearch" component={UserSearchScreen} />
          <Stack.Screen name="FollowingList" component={FollowListScreen} initialParams={{ mode: 'following' }} />
          <Stack.Screen name="FollowersList" component={FollowListScreen} initialParams={{ mode: 'followers' }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
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
    shadowOffset: { width: 0, height: 8 },
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
