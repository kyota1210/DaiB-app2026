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
                        最終更新日: 2026年4月26日
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
                        ・アカウント情報：メールアドレス、ユーザー名、自己紹介、プロフィール画像（アバター）。パスワードは Supabase Auth により安全にハッシュ化され、当アプリ運営者は平文を取得しません。{'\n'}
                        ・投稿情報：投稿した写真、タイトル、説明、日付、カテゴリー情報、「スレッドに表示する」設定{'\n'}
                        ・フォロー関係：フォロー・フォロワー・フレンド関係（誰と相互承認しているか）{'\n'}
                        ・リアクション：投稿に付与した絵文字{'\n'}
                        ・通報・ブロック：ユーザーや投稿に対して行った通報・ブロック内容{'\n'}
                        ・認証情報：Supabase Auth が発行するアクセストークン（端末の暗号化ストレージに保存）{'\n'}
                        ・端末内の設定：表示言語、表示モード等（端末内ストレージに保存）{'\n'}
                        ・サブスクリプション情報：プレミアムプランの加入状況、有効期限、ストア種別（Apple／Google）、original transaction ID（個別の決済情報・カード情報は当アプリでは取得しません）{'\n'}
                        ・サーバー側のログ：アクセス・エラー等の記録（運用・障害対応のため）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        また、以下の権限を利用します。いずれも該当機能利用時にのみ使用し、許可いただいた範囲を超えて取得することはありません。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        ・カメラ：QR コードスキャンによるフレンド申請機能で使用{'\n'}
                        ・フォトライブラリ：投稿の写真・プロフィール画像の設定で使用{'\n'}
                        ・トラッキング許可（iOS の App Tracking Transparency）：第三者広告ネットワークによる広告最適化のため、初回起動時に同意を求めます。許可しない場合でも当アプリの基本機能はご利用いただけます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        2. 情報の利用目的
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        ・アプリサービスの提供・運営{'\n'}
                        ・タイムライン・スレッド機能の提供（フレンドの直近 7 日分の投稿を表示）{'\n'}
                        ・フォロー／フレンド機能の提供{'\n'}
                        ・ユーザー認証・セキュリティの維持・不正利用の防止{'\n'}
                        ・通報されたコンテンツの審査・モデレーション{'\n'}
                        ・サブスクリプションプランの管理（特典の付与・解約反映等）{'\n'}
                        ・広告配信・効果測定（無料プラン利用時）{'\n'}
                        ・アプリのクラッシュ・エラー解析、品質改善{'\n'}
                        ・ユーザーサポート・お問い合わせ対応
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        3. 情報の保存とセキュリティ
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        ・アカウント・投稿等のデータは Supabase（PostgreSQL）に保存し、Row Level Security により本人以外からのアクセスを制限しています{'\n'}
                        ・写真等のアセットは Supabase Storage に保存します{'\n'}
                        ・パスワードは Supabase Auth により安全にハッシュ化されます。当アプリ運営者は平文パスワードにアクセスできません{'\n'}
                        ・認証トークンは端末の SecureStore（暗号化ストレージ）に保存します{'\n'}
                        ・通信は HTTPS で暗号化します{'\n'}
                        ・サブスクリプション情報は Apple／Google から提供される情報を当アプリのサーバーで検証して保存します
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        4. 第三者サービス
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、サービス提供のため以下の第三者サービスと情報を送受信します。各サービスのプライバシーポリシーが適用されますので、そちらもあわせてご確認ください。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        ・Supabase（バックエンド・認証・ストレージ。米 Supabase, Inc.）{'\n'}
                        ・Apple（iOS のアプリ内課金・通知。Apple Inc.）{'\n'}
                        ・Google（Android 配信時の Play 課金。Google LLC）{'\n'}
                        ・Google AdMob（広告配信。無料プラン利用時。広告 ID・端末情報・大まかな位置情報を含む場合があります）{'\n'}
                        ・Sentry（クラッシュレポート。導入時はエラー文脈と匿名化したユーザー識別子を送信）{'\n'}
                        ・Expo / React Native（アプリ実行基盤。Expo Application Services によるビルド配信）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        広告配信は無料プランのご利用時のみ表示され、プレミアムプラン加入中は表示しません。広告にはターゲティング広告（パーソナライズ広告）が含まれる場合がありますが、iOS の App Tracking Transparency でトラッキングを許可しない選択をされた場合は、トラッキングを伴わない広告のみ表示されます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        5. 情報の共有と開示
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        ・ユーザーの同意がある場合{'\n'}
                        ・法令に基づく開示が求められた場合{'\n'}
                        ・人の生命、身体または財産の保護のために必要がある場合{'\n'}
                        ・サービスの提供に必要な業務委託先（前項の第三者サービス）への開示（適切な管理下で）
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        6. ユーザーの権利
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        ・個人情報の閲覧・訂正・削除を請求する権利{'\n'}
                        ・個人情報の利用停止を請求する権利{'\n'}
                        ・データのポータビリティを請求する権利{'\n'}
                        ・アカウントの削除（退会）：設定 → ログイン情報 → アカウントの削除 から、ご自身でいつでも実行できます。削除すると関連するデータは速やかに削除または匿名化されます（法的保存義務がある場合を除く）。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        7. データの保存期間
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、ユーザーがアカウントを削除するまで、またはユーザーが削除を要求するまで、個人情報を保存します。アカウント削除後は、法的な保存義務がある場合を除き、個人情報を削除します。バックアップから完全に消去されるまで最長 30 日かかる場合があります。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        8. クッキー・トラッキング技術
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        モバイルアプリのためブラウザクッキーは使用しませんが、広告配信およびクラッシュレポートのために、端末識別子（広告 ID 等）を利用する場合があります。iOS では App Tracking Transparency による同意取得を行います。トラッキングを許可しない選択をされた場合、当アプリはトラッキング目的で広告 ID を取得しません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        9. 子どもの個人情報
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは 13 歳未満の方の利用を想定していません。13 歳未満の方の個人情報を意図的に収集することはありません。誤って収集されたことが判明した場合、速やかに削除します。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        10. プライバシーポリシーの変更
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、アプリ内で通知します。変更後もアプリを継続して利用する場合、変更後のポリシーに同意したものとみなします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        11. お問い合わせ
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        個人情報の取り扱いに関するご質問やご要望がございましたら、設定 → お問い合わせ よりご連絡ください。
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
