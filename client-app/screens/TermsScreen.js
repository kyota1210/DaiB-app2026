import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';

const TermsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScreenHeader title={t('terms')} onBack={() => navigation.goBack()} />

            <ScrollView 
                style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.lastUpdated, { color: theme.colors.secondaryText }]}>
                        最終更新日: 2026年4月26日
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第1条（適用）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        本利用規約（以下「本規約」といいます。）は、DaiB（以下「当アプリ」といいます。）の利用条件を定めるものです。登録ユーザー（以下「ユーザー」といいます。）には、本規約に従って当アプリをご利用いただきます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第2条（利用登録）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリの利用を希望する者は、本規約に同意の上、当アプリの定める方法によって利用登録を申請し、当アプリがこれを承認することによって、利用登録が完了するものとします。当アプリは、申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        （1）申請に際して虚偽の事項を届け出た場合{'\n'}
                        （2）本規約に違反したことがある者からの申請である場合{'\n'}
                        （3）13 歳未満であると判明した場合{'\n'}
                        （4）その他、当アプリが利用登録を相当でないと判断した場合
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第3条（アカウントの管理）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、自己の責任において、当アプリのアカウントおよびパスワードを適切に管理するものとします。アカウント情報が第三者に使用されたことによって生じた損害は、当アプリに故意または重大な過失がある場合を除き、当アプリは一切の責任を負いません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第4条（プレミアムプランおよび課金）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリの基本的な機能は無料で提供されます。一部の機能（プレミアムプラン）は、月額のサブスクリプションとして有料で提供されます。ご利用にあたっては以下の条件に同意いただく必要があります。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        （1）支払いはアプリストアの定める決済システム（Apple App Store のアプリ内課金）を通じて行われ、当アプリは決済情報を直接取得しません。{'\n'}
                        （2）プレミアムプランは自動更新型のサブスクリプションです。期間終了前にアプリストアの設定画面から解約しない限り、自動的に更新されます。{'\n'}
                        （3）解約はアプリストアの設定画面（iOS：設定 → Apple ID → サブスクリプション）から実行できます。当アプリ側で解約手続きは行えません。{'\n'}
                        （4）課金後の途中解約による日割り返金は原則行いません。返金は Apple の払い戻しポリシーに従います。{'\n'}
                        （5）導入時に無料トライアル期間が設定される場合があります。トライアル期間中に解約されない場合、自動的に有料期間へ移行します。{'\n'}
                        （6）価格・特典は予告なく変更されることがあります。変更後の継続利用をもって変更後の条件への同意とみなします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第5条（広告の表示）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、無料プランのユーザーに対して第三者広告ネットワーク（Google AdMob 等）による広告を表示することがあります。広告の表示・非表示・配信方法は、本規約および「プライバシーポリシー」に基づきます。プレミアムプラン加入中は広告を表示しません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第6条（投稿コンテンツ）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、ご自身が投稿したコンテンツ（写真・テキスト・カテゴリー等）に対する責任を負います。投稿コンテンツの著作権はユーザーに帰属しますが、ユーザーは当アプリに対し、サービスの提供・運営・改善および広報目的の範囲で必要な利用権を許諾するものとします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第7条（禁止事項）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、当アプリの利用にあたり、以下の行為をしてはなりません。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        （1）法令または公序良俗に違反する行為{'\n'}
                        （2）犯罪行為に関連する行為{'\n'}
                        （3）当アプリの内容等を無断で複製、転載、改変等する行為{'\n'}
                        （4）当アプリの運営を妨害するおそれのある行為{'\n'}
                        （5）他のユーザーに関する個人情報等を収集・蓄積する行為{'\n'}
                        （6）不正アクセス、不正な方法による利用登録の申請等、当アプリの運営を妨害する行為{'\n'}
                        （7）他者を誹謗中傷、脅迫、嫌がらせする行為{'\n'}
                        （8）児童ポルノ、わいせつ、暴力的、差別的、その他他者に不快感を与える可能性のあるコンテンツの投稿{'\n'}
                        （9）スパム、過度な勧誘・広告、なりすまし、詐欺的行為{'\n'}
                        （10）アプリストアの規約に違反する形での課金回避・不正利用{'\n'}
                        （11）その他、当アプリが不適切と判断する行為
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第8条（通報・ブロック・モデレーション）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、不適切なコンテンツや他のユーザーを、当アプリ所定の方法で通報・ブロックできます。当アプリは通報を受けたコンテンツを審査し、必要に応じて非表示・削除、当該ユーザーへの警告、利用停止等の措置を行います。原則として通報受領から 24 時間以内の初動対応を目指しますが、内容により時間を要する場合があります。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第9条（当アプリの提供の停止等）
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        （1）当アプリにかかるシステムの保守点検または更新を行う場合{'\n'}
                        （2）地震、落雷、火災、停電または天災などの不可抗力により、当アプリの提供が困難となった場合{'\n'}
                        （3）コンピュータまたは通信回線等が事故により停止した場合{'\n'}
                        （4）その他、当アプリが当アプリの提供が困難と判断した場合
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第10条（保証の否認および免責）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、当アプリに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。当アプリに起因してユーザーに生じたあらゆる損害について、当アプリは一切の責任を負いません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第11条（サービス内容の変更等）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあります。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第12条（利用規約の変更）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、必要と判断した場合には、ユーザーに通知の上、本規約を変更することができます。本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第13条（個人情報の取扱い）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、本サービスの利用によって取得する個人情報については、当アプリ「プライバシーポリシー」に従い適切に取り扱うものとします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第14条（退会）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、設定画面から自身のアカウントを削除（退会）することができます。退会後の関連データの取り扱いはプライバシーポリシーに従います。プレミアムプランをご利用中の場合は、退会前にアプリストアでサブスクリプションを解約してください。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第15条（準拠法・裁判管轄）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当アプリ運営者の本店所在地を管轄する裁判所を専属的合意管轄とします。
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

export default TermsScreen;
