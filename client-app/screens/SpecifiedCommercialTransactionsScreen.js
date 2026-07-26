import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';
import { PLUS_MONTHLY_PRICE_YEN } from '../config';

/**
 * 特定商取引法に基づく表記
 *
 * 注: 各値は運営者情報が確定後、固定値に置換すること（Doc/docs/release-checklist.md §1.2）。
 * 個人情報の取扱いを避けたい場合は、住所・電話の項目を「請求があれば遅滞なく開示」運用も可。
 *
 * 販売価格は config.js の PLUS_MONTHLY_PRICE_YEN と App Store の価格設定で同期すること。
 */
const SpecifiedCommercialTransactionsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('specifiedCommercialTransactions')} onBack={() => navigation.goBack()} />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.lastUpdated, { color: theme.colors.secondaryText }]}>
                        最終更新日: 2026年7月26日
                    </Text>

                    <Row label="販売事業者" value="Moriyama Kyota" theme={theme} />
                    <Row label="所在地" value="ご請求があれば遅滞なく開示します" theme={theme} />
                    <Row label="連絡先" value="ご請求があれば遅滞なく開示します" theme={theme} />
                    <Row label="メールアドレス" value="設定内のお問い合わせフォームよりご連絡ください" theme={theme} />

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        販売価格
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        Plusプラン（月額）：{PLUS_MONTHLY_PRICE_YEN} 円（税込）
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        商品代金以外に必要な費用
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        サービスのご利用にあたり通信料が発生します。お客様のご負担となります。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        お支払い方法
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        Apple App Store のアプリ内課金にてお支払いいただきます。当アプリは決済情報を直接取り扱いません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        お支払い時期
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        プラン購入時に初回課金が行われ、以降は自動更新によりサブスクリプション期間ごとに課金されます。詳細は Apple の利用規約をご確認ください。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        サービスの提供時期
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        決済完了後、即時にPlusの機能をご利用いただけます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        解約・キャンセル
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        サブスクリプションは、Apple ID の設定画面（設定 → Apple ID → サブスクリプション）からいつでも解約できます。次回課金日の 24 時間前までに解約手続きを行ってください。{'\n\n'}
                        当アプリ運営者側では解約手続きを行うことはできません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        返品・返金
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        サブスクリプションは性質上、購入後の返金は原則承っておりません。返金については Apple の払い戻しポリシーに従います。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        動作環境
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        iOS 15.1 以降を推奨します。{'\n'}
                        端末・OS バージョンによっては一部機能をご利用いただけない場合があります。
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const Row = ({ label, value, theme }) => (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: theme.colors.secondaryText }]}>{value}</Text>
    </View>
);

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
    row: {
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    rowValue: {
        fontSize: 15,
        lineHeight: 22,
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
});

export default SpecifiedCommercialTransactionsScreen;
