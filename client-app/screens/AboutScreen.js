import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const AboutScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            {/* ヘッダー */}
            <View style={[styles.header, { 
                backgroundColor: '#000000',
                borderBottomColor: theme.colors.border 
            }]}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {t('about')}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView 
                style={[styles.scrollView, { backgroundColor: '#000000' }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.content, { backgroundColor: '#000000' }]}>
                    <Text style={[styles.appName, { color: theme.colors.text }]}>
                        Otium
                    </Text>
                    <Text style={[styles.version, { color: theme.colors.secondaryText }]}>
                        バージョン 1.0.0
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        アプリについて
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        Otium（オーティアム）は、日々の記録を写真と共に作成・管理できるモバイルアプリケーションです。JWT認証により、各ユーザーは自分の記録のみにアクセスでき、セキュアな環境で記録を管理できます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        主要機能
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        • 写真付き記録の作成・閲覧・更新・削除{'\n'}
                        • カテゴリーによる記録の分類・管理{'\n'}
                        • 複数の表示モード（グリッド、リスト、ブックリスト）{'\n'}
                        • 多言語対応（日本語・英語）{'\n'}
                        • ダークテーマ対応
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        技術情報
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        このアプリは、React NativeとExpoを使用して開発されています。バックエンドはNode.jsとExpress、データベースはMySQLを使用しています。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        ライセンス
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        このアプリケーションは0BSDライセンスの下で提供されています。
                    </Text>

                    <Text style={[styles.footer, { color: theme.colors.inactive }]}>
                        © 2026 Otium. All rights reserved.
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 32,
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
