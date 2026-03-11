import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';

const PrivacyScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('privacy')} onBack={() => navigation.goBack()} />

            <ScrollView 
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.lastUpdated, { color: theme.colors.secondaryText }]}>
                        最終更新日: 2026年3月11日
                    </Text>

                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        DaiB（以下「当アプリ」といいます。）は、ユーザーの個人情報の保護を重要視しています。本プライバシーポリシーは、当アプリがどのように個人情報を収集、使用、保護するかについて説明します。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        1. 収集する情報
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、サービスの提供に必要な範囲で、以下の情報を収集・保存します。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        • アカウント情報：メールアドレス、パスワード（ハッシュ化）、ユーザー名、自己紹介、プロフィール画像（アバター）{'\n'}
                        • 記録情報：投稿した写真、タイトル、説明、日付、カテゴリー情報（1件の記録に複数カテゴリーを紐づけ可能）、「スレッドに表示する」の設定{'\n'}
                        • フォロー関係：フォロー・フォロワー関係（誰をフォローしているか、誰にフォローされているか）{'\n'}
                        • 認証情報：JWTトークン（端末の暗号化ストレージに保存）{'\n'}
                        • 端末内の設定：表示言語の選択（端末内ストレージに保存）{'\n'}
                        • サーバー側のログ：アクセス・エラー等の記録（運用・障害対応のため）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        また、以下の権限を利用します。いずれも該当機能利用時にのみ使用し、許可いただいた範囲を超えて取得することはありません。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        • カメラ：QRコードスキャンによるフォロー機能で使用{'\n'}
                        • フォトライブラリ：記録の写真投稿・プロフィール画像の設定で使用
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        2. 情報の利用目的
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、収集した情報を以下の目的で利用します：
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        • アプリサービスの提供・運営（記録の作成・編集・削除、カテゴリー管理、一覧表示）{'\n'}
                        • タイムライン機能の提供（「スレッドに表示する」が有効な記録を、フォローしているユーザーに表示）{'\n'}
                        • フォロー機能の提供（フォロー・フォロワー一覧、他ユーザーのプロフィール・アバター表示）{'\n'}
                        • ユーザー認証・セキュリティの維持{'\n'}
                        • ユーザーサポート・お問い合わせ対応{'\n'}
                        • サービスの改善・障害対応{'\n'}
                        • 不正利用の防止
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        3. 情報の保存とセキュリティ
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、ユーザーの個人情報を安全に保護するため、以下の対策を講じています：
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        • パスワードはbcryptによりハッシュ化してサーバーに保存{'\n'}
                        • JWT認証によるセキュアなアクセス制御{'\n'}
                        • 認証トークンは端末のSecureStore（暗号化ストレージ）に保存{'\n'}
                        • 言語設定は端末のストレージに保存（サーバーへ送信しない）{'\n'}
                        • HTTPS通信によるデータの暗号化{'\n'}
                        • データベースへの適切なアクセス制御
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        4. 情報の共有と開示
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、以下の場合を除き、ユーザーの個人情報を第三者に開示・共有することはありません：
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        • ユーザーの同意がある場合{'\n'}
                        • 法令に基づく開示が求められた場合{'\n'}
                        • 人の生命、身体または財産の保護のために必要がある場合{'\n'}
                        • サービスの提供に必要な業務委託先への開示（適切な管理下で）
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        5. ユーザーの権利
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、以下の権利を有します：
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        • 個人情報の閲覧・訂正・削除を請求する権利{'\n'}
                        • 個人情報の利用停止を請求する権利{'\n'}
                        • データのポータビリティを請求する権利
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        これらの権利を行使したい場合は、アプリ内の設定画面からお問い合わせください。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        6. データの保存期間
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、ユーザーがアカウントを削除するまで、またはユーザーが削除を要求するまで、個人情報を保存します。アカウント削除後は、法的な保存義務がある場合を除き、個人情報を削除します。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        7. クッキーおよびトラッキング技術
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、現在、クッキーやトラッキング技術を使用していません。将来的に使用する場合は、本ポリシーを更新して通知します。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        8. 第三者サービス
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、サービス提供のため当アプリが運用するサーバーと通信し、上記の情報を送受信します。現在、外部の分析サービス・広告サービス・SNS連携は使用していません。アプリの基盤としてExpo（React Native）等の技術を利用していますが、これらによる個人情報の第三者への送信は行っていません。将来的に第三者サービスを利用する場合は、本ポリシーを更新して通知します。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        9. プライバシーポリシーの変更
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、アプリ内で通知します。変更後もアプリを継続して利用する場合、変更後のポリシーに同意したものとみなします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        10. お問い合わせ
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        個人情報の取り扱いに関するご質問やご要望がございましたら、アプリ内の設定画面からお問い合わせください。
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
    lastUpdated: {
        fontSize: 12,
        marginBottom: 24,
        textAlign: 'right',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 12,
    },
    text: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
    },
    listItem: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
        paddingLeft: 8,
    },
});

export default PrivacyScreen;
