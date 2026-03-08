import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';

const HelpScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('help')} onBack={() => navigation.goBack()} />

            <ScrollView 
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        基本的な使い方
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        Otiumは、日々の記録を写真と共に管理できるアプリです。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        記録の作成
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ホーム画面右上の「+」ボタンをタップして、新しい記録を作成できます。写真を選択し、日付、タイトル、説明、カテゴリーを設定してください。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        カテゴリーの管理
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        設定画面から「カテゴリー管理」にアクセスして、カテゴリーの追加・編集・削除ができます。ホーム画面のカテゴリータブを長押しすると、直接編集できます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        表示モードの切り替え
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ホーム画面右上の表示モードボタンで、グリッド表示、リスト表示、ブックリスト表示を切り替えられます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        記録の編集・削除
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        記録詳細画面右上のメニューボタンから、記録の編集や削除ができます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        よくある質問
                    </Text>
                    <Text style={[styles.question, { color: theme.colors.text }]}>
                        Q: 写真のサイズ制限はありますか？
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        A: アップロード時の自動圧縮により、大きなファイルでも問題なくアップロードできます。
                    </Text>

                    <Text style={[styles.question, { color: theme.colors.text }]}>
                        Q: カテゴリーはいくつまで作成できますか？
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        A: 現在、カテゴリーの作成数に制限はありません。
                    </Text>

                    <Text style={[styles.question, { color: theme.colors.text }]}>
                        Q: データはどこに保存されますか？
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        A: すべてのデータはサーバーに安全に保存され、JWT認証により保護されています。
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
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 12,
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    text: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
    },
});

export default HelpScreen;
