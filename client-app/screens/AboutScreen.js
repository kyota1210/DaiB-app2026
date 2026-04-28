import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';

const AboutScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const appVersion = Constants.expoConfig?.version || '1.0.0';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('about')} onBack={() => navigation.goBack()} />

            <ScrollView 
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.appName, { color: theme.colors.text }]}>
                        DaiB
                    </Text>
                    <Text style={[styles.version, { color: theme.colors.secondaryText }]}>
                        バージョン {appVersion}
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        アプリについて
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        DaiB（デイビー）は、日々の記録を写真と共に作成・管理し、相互承認したフレンドの直近の投稿をスレッドで楽しめるモバイルアプリケーションです。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        主要機能
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ・写真付き投稿の作成・閲覧・編集・削除{'\n'}
                        ・カテゴリーによる投稿の分類・管理{'\n'}
                        ・複数の表示モード（グリッド／リスト／ブックリスト／タイル）{'\n'}
                        ・QR コード／招待リンクによるフレンド申請{'\n'}
                        ・直近 7 日のフレンド投稿スレッド・リアクション{'\n'}
                        ・通報・ブロック機能{'\n'}
                        ・多言語対応（日本語・英語）
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        技術情報
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        本アプリは React Native と Expo を使用して開発されています。バックエンドは Supabase（PostgreSQL／Auth／Storage／Edge Functions）を利用し、クライアントは Supabase JS により直接アクセスします。投稿・プロフィール画像は Supabase Storage に保存されます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        運営者情報
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        運営者の所在地・連絡先などの詳細は「特定商取引法に基づく表記」をご覧ください。お問い合わせは設定 → お問い合わせ よりお願いします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        ライセンス
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        このアプリケーションは 0BSD ライセンスの下で提供されています。利用している主要なオープンソースソフトウェアの著作権はそれぞれの権利者に帰属します。
                    </Text>

                    <Text style={[styles.footer, { color: theme.colors.inactive }]}>
                        © 2026 DaiB. All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    content: {
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    version: {
        fontSize: 14,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 12,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    footer: {
        fontSize: 12,
        marginTop: 32,
        textAlign: 'center',
    },
});

export default AboutScreen;
