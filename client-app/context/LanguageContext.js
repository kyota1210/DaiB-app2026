import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

export const LanguageContext = createContext();

// 言語リソース
const translations = {
    ja: {
        // 共通
        cancel: 'キャンセル',
        save: '保存',
        delete: '削除',
        edit: '編集',
        ok: 'OK',
        update: '更新',
        close: '閉じる',
        back: '戻る',
        
        // ナビゲーション
        gallery: 'ギャラリー',
        create: '作成',
        thread: 'スレッド',
        settings: '設定',
        detail: '詳細',
        
        // 設定画面
        accountSettings: 'アカウント設定',
        loginInfo: 'ログイン情報の変更',
        premiumPlan: 'プレミアムプランの設定',
        otiumSettings: 'Otium設定',
        categoryManagement: 'カテゴリー管理',
        displaySettings: '表示設定',
        appSettings: 'アプリ設定',
        notificationSettings: '通知設定',
        languageSettings: '言語設定',
        themeSettings: 'テーマ',
        other: 'その他',
        help: 'ヘルプ',
        about: 'アプリについて',
        terms: '利用規約',
        privacy: 'プライバシーポリシー',
        contact: 'お問い合わせ',
        logout: 'ログアウト',
        profileSettings: 'プロフィール設定',
        
        // 記録画面
        noRecords: 'まだ記録がありません。',
        totalArchives: 'Total Archives',
        recordDetail: '記録の詳細',
        
        // 作成・編集画面
        title: 'タイトル',
        titlePlaceholder: 'タイトルを入力',
        date: '日付',
        category: 'カテゴリー',
        comment: 'コメント',
        commentPlaceholder: 'キャプションを入力...',
        addPhoto: '写真を追加',
        createRecord: '作成する',
        editRecord: '記録を編集',
        creating: '作成中...',
        required: '*',
        
        // ログイン・サインアップ
        login: 'ログイン',
        signup: '新規ユーザー登録',
        email: 'メールアドレス',
        password: 'パスワード',
        displayName: '表示名（オプション）',
        loggingIn: 'ログイン中...',
        signingUp: '登録中...',
        goToSignup: '新規登録はこちら',
        backToLogin: 'ログイン画面に戻る',
        
        // プロフィール編集
        userName: 'ユーザー名',
        userNamePlaceholder: 'ユーザー名を入力',
        bio: '自己紹介',
        bioPlaceholder: '自己紹介を入力（100文字まで）',
        tapToSelectPhoto: 'タップして写真を選択',
        
        // ログイン情報変更
        currentEmail: '現在のメールアドレス',
        newEmail: '新しいメールアドレス',
        newEmailPlaceholder: '新しいメールアドレスを入力',
        currentPassword: '現在のパスワード',
        currentPasswordPlaceholder: '現在のパスワードを入力',
        newPassword: '新しいパスワード',
        newPasswordPlaceholder: '新しいパスワードを入力',
        confirmPassword: '新しいパスワード（確認）',
        confirmPasswordPlaceholder: '新しいパスワードを再入力',
        changeEmail: 'メールアドレスを変更',
        changePassword: 'パスワードを変更',
        emailSection: 'メールアドレス',
        passwordSection: 'パスワード',
        
        // プレミアムプラン
        premiumActive: 'プレミアムプラン利用中',
        freePlan: 'フリープラン',
        nextRenewal: '次回更新日',
        freeForever: '無料でご利用いただけます',
        premiumFeatures: 'プレミアム機能',
        pricingPlan: '料金プラン',
        perMonth: '/月',
        cancelAnytime: 'いつでもキャンセル可能',
        upgradeToPremium: 'プレミアムにアップグレード',
        cancelPlan: 'プランを解約',
        unlimitedStorage: '無制限のクラウドストレージ',
        allPhotosCloud: 'すべての写真と動画をクラウドに保存',
        advancedFilters: '高度なフィルター機能',
        professionalTools: 'プロフェッショナルな編集ツール',
        detailedStats: '詳細な統計とインサイト',
        analyzeTrends: '記録の傾向を詳しく分析',
        noAds: '広告なし',
        comfortableViewing: '快適な閲覧体験',
        prioritySupport: '優先サポート',
        rapidSupport: '専門スタッフによる迅速なサポート',
        
        // カテゴリー管理
        newCategory: '新しいカテゴリー',
        editCategory: 'カテゴリーを編集',
        addNewCategory: '新しいカテゴリーを追加',
        categoryName: 'カテゴリー名',
        categoryNamePlaceholder: '例: 読書、運動、料理',
        icon: 'アイコン',
        color: 'カラー',
        preview: 'プレビュー',
        defaultCategory: 'カテゴリー名',
        add: '追加',
        
        // テーマ設定
        theme: 'テーマ',
        lightMode: 'ライトモード',
        lightModeDesc: '明るいテーマで表示します',
        darkMode: 'ダークモード',
        darkModeDesc: '暗いテーマで表示します',
        systemSettings: 'システム設定に従う',
        systemSettingsDesc: 'デバイスの設定に合わせて自動で切り替わります',
        currentTheme: '現在のテーマ',
        selectTheme: 'アプリの表示テーマを選択してください',
        themeApplied: 'このテーマが適用されています',
        themeAutoApplied: 'システム設定に従って自動的に適用されています',
        
        // 言語設定
        language: '言語',
        japanese: '日本語',
        english: 'English',
        currentLanguage: '現在の言語',
        selectLanguage: 'アプリの表示言語を選択してください',
        languageApplied: 'この言語が適用されています',
        languageAutoApplied: 'システム設定に従って自動的に適用されています',
        languageChangeNote: '言語を変更すると、アプリ全体の表示が即座に切り替わります。',
        averagePerMonth: '件/月',
        longestStreak: '最長ストリーク',
        days: '日',
        favoriteTime: 'お気に入りの時間帯',
        afternoon: '午後',
        categoryStats: 'カテゴリー別記録',
        
        // エラー・確認メッセージ
        error: 'エラー',
        success: '成功',
        confirm: '確認',
        completed: '完了',
        deleteConfirm: '削除確認',
        deleteConfirmMessage: '削除します。よろしいですか？',
        deleteRecordMessage: 'この記録を本当に削除しますか？',
        logoutConfirm: 'ログアウトしますか？',
        changeEmailConfirm: 'メールアドレスを変更しますか？',
        cancelPlanConfirm: '本当に解約しますか？',
        deleteCategoryConfirm: 'を削除しますか？',
        photoSelectRequired: '写真を選択してください',
        
        // 成功メッセージ
        recordCreated: '新しい記録が追加されました。',
        recordAdded: '記録を追加しました',
        recordUpdated: '記録が更新されました。',
        profileUpdated: 'プロフィールを更新しました',
        emailChanged: 'メールアドレスを変更しました',
        passwordChanged: 'パスワードを変更しました',
        categoryAdded: 'カテゴリーを追加しました',
        categoryUpdated: 'カテゴリーを更新しました',
        categoryDeleted: 'カテゴリーを削除しました',
        upgradedToPremium: 'プレミアムプランにアップグレードしました',
        planCanceled: 'プレミアムプランを解約しました',
        
        // その他
        loading: '読み込み中...',
        checkingAuth: '認証状態を確認中...',
        noImage: 'No Image',
        average: '平均',
    },
    en: {
        // Common
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        ok: 'OK',
        update: 'Update',
        close: 'Close',
        back: 'Back',
        
        // Navigation
        gallery: 'Gallery',
        create: 'Create',
        thread: 'Thread',
        settings: 'Settings',
        detail: 'Detail',
        
        // Settings screen
        accountSettings: 'Account Settings',
        loginInfo: 'Change Login Info',
        premiumPlan: 'Premium Plan Settings',
        otiumSettings: 'Otium Settings',
        categoryManagement: 'Category Management',
        displaySettings: 'Display Settings',
        appSettings: 'App Settings',
        notificationSettings: 'Notification Settings',
        languageSettings: 'Language Settings',
        themeSettings: 'Theme',
        other: 'Other',
        help: 'Help',
        about: 'About',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        contact: 'Contact',
        logout: 'Logout',
        profileSettings: 'Profile Settings',
        
        // Records screen
        noRecords: 'No records yet.',
        totalArchives: 'Total Archives',
        recordDetail: 'Record Detail',
        
        // Create/Edit screen
        title: 'Title',
        titlePlaceholder: 'Enter title',
        date: 'Date',
        category: 'Category',
        comment: 'Comment',
        commentPlaceholder: 'Enter comment...',
        addPhoto: 'Add Photo',
        createRecord: 'Create',
        editRecord: 'Edit Record',
        creating: 'Creating...',
        required: '*',
        
        // Login/Signup
        login: 'Login',
        signup: 'Sign Up',
        email: 'Email Address',
        password: 'Password',
        displayName: 'Display Name (Optional)',
        loggingIn: 'Logging in...',
        signingUp: 'Signing up...',
        goToSignup: 'Sign up here',
        backToLogin: 'Back to login',
        
        // Profile edit
        userName: 'User Name',
        userNamePlaceholder: 'Enter user name',
        bio: 'Bio',
        bioPlaceholder: 'Enter bio (max 100 characters)',
        tapToSelectPhoto: 'Tap to select photo',
        
        // Login info change
        currentEmail: 'Current Email',
        newEmail: 'New Email',
        newEmailPlaceholder: 'Enter new email',
        currentPassword: 'Current Password',
        currentPasswordPlaceholder: 'Enter current password',
        newPassword: 'New Password',
        newPasswordPlaceholder: 'Enter new password',
        confirmPassword: 'Confirm Password',
        confirmPasswordPlaceholder: 'Re-enter new password',
        changeEmail: 'Change Email',
        changePassword: 'Change Password',
        emailSection: 'Email Address',
        passwordSection: 'Password',
        
        // Premium plan
        premiumActive: 'Premium Plan Active',
        freePlan: 'Free Plan',
        nextRenewal: 'Next renewal',
        freeForever: 'Free forever',
        premiumFeatures: 'Premium Features',
        pricingPlan: 'Pricing Plan',
        perMonth: '/month',
        cancelAnytime: 'Cancel anytime',
        upgradeToPremium: 'Upgrade to Premium',
        cancelPlan: 'Cancel Plan',
        unlimitedStorage: 'Unlimited Cloud Storage',
        allPhotosCloud: 'Store all photos and videos in the cloud',
        advancedFilters: 'Advanced Filter Features',
        professionalTools: 'Professional editing tools',
        detailedStats: 'Detailed Statistics & Insights',
        analyzeTrends: 'Analyze your record trends',
        noAds: 'No Ads',
        comfortableViewing: 'Comfortable viewing experience',
        prioritySupport: 'Priority Support',
        rapidSupport: 'Rapid support from specialists',
        
        // Category management
        newCategory: 'New Category',
        editCategory: 'Edit Category',
        addNewCategory: 'Add New Category',
        categoryName: 'Category Name',
        categoryNamePlaceholder: 'e.g. Reading, Exercise, Cooking',
        icon: 'Icon',
        color: 'Color',
        preview: 'Preview',
        defaultCategory: 'Category Name',
        add: 'Add',
        
        // Theme settings
        theme: 'Theme',
        lightMode: 'Light Mode',
        lightModeDesc: 'Display with light theme',
        darkMode: 'Dark Mode',
        darkModeDesc: 'Display with dark theme',
        systemSettings: 'Follow System Settings',
        systemSettingsDesc: 'Automatically switches based on device settings',
        currentTheme: 'Current Theme',
        selectTheme: 'Select your app display theme',
        themeApplied: 'This theme is applied',
        themeAutoApplied: 'Automatically applied based on system settings',
        
        // Language settings
        language: 'Language',
        japanese: 'Japanese',
        english: 'English',
        currentLanguage: 'Current Language',
        selectLanguage: 'Select your preferred language',
        languageApplied: 'This language is applied',
        languageAutoApplied: 'Automatically applied based on system settings',
        languageChangeNote: 'Changing the language will immediately update the entire app display.',
        thisWeek: 'This Week',
        categories: 'Categories',
        activity: 'Activity',
        averagePerMonth: '/month',
        longestStreak: 'Longest Streak',
        days: 'days',
        favoriteTime: 'Favorite Time',
        afternoon: 'Afternoon',
        categoryStats: 'Records by Category',
        
        // Error/Confirm messages
        error: 'Error',
        success: 'Success',
        confirm: 'Confirm',
        completed: 'Completed',
        deleteConfirm: 'Delete Confirmation',
        deleteConfirmMessage: 'Are you sure you want to delete?',
        deleteRecordMessage: 'Are you sure you want to delete this record?',
        logoutConfirm: 'Are you sure you want to logout?',
        changeEmailConfirm: 'Do you want to change your email address?',
        cancelPlanConfirm: 'Are you sure you want to cancel?',
        deleteCategoryConfirm: 'Do you want to delete',
        photoSelectRequired: 'Please select a photo',
        
        // Success messages
        recordCreated: 'New record has been added.',
        recordAdded: 'Record has been added',
        recordUpdated: 'Record has been updated.',
        profileUpdated: 'Profile has been updated',
        emailChanged: 'Email address has been changed',
        passwordChanged: 'Password has been changed',
        categoryAdded: 'Category has been added',
        categoryUpdated: 'Category has been updated',
        categoryDeleted: 'Category has been deleted',
        upgradedToPremium: 'Upgraded to Premium Plan',
        planCanceled: 'Premium Plan has been canceled',
        
        // Other
        loading: 'Loading...',
        checkingAuth: 'Checking authentication...',
        noImage: 'No Image',
        average: 'Average',
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('system'); // 'ja', 'en', 'system'
    const [isLoading, setIsLoading] = useState(true);

    // システムの言語を取得
    const getSystemLanguage = () => {
        const systemLang = Platform.OS === 'ios'
            ? NativeModules.SettingsManager?.settings?.AppleLocale ||
              NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
            : NativeModules.I18nManager?.localeIdentifier;
        
        // 言語コードを抽出（例: "ja_JP" -> "ja"）
        const langCode = systemLang?.split(/[-_]/)[0] || 'ja';
        return langCode === 'en' ? 'en' : 'ja';
    };

    // 実際に適用される言語を計算
    const getActiveLanguage = () => {
        if (language === 'system') {
            return getSystemLanguage();
        }
        return language;
    };

    const activeLanguage = getActiveLanguage();

    // 翻訳関数
    const t = (key) => {
        return translations[activeLanguage]?.[key] || translations['ja'][key] || key;
    };

    // 初回読み込み時に言語設定を取得
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

    const changeLanguage = async (newLanguage) => {
        try {
            await AsyncStorage.setItem('app_language', newLanguage);
            setLanguage(newLanguage);
        } catch (error) {
            console.error('言語設定の保存エラー:', error);
        }
    };

    return (
        <LanguageContext.Provider 
            value={{ 
                language,
                activeLanguage,
                changeLanguage,
                t,
                isLoading,
            }}
        >
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
