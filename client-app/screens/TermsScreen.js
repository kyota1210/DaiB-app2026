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
                        最終更新日: 2026年1月24日
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第1条（適用）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        本利用規約（以下「本規約」といいます。）は、Otium（以下「当アプリ」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に従って、当アプリをご利用いただきます。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第2条（利用登録）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリの利用を希望する者は、本規約に同意の上、当アプリの定める方法によって利用登録を申請し、当アプリがこれを承認することによって、利用登録が完了するものとします。当アプリは、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        （1）利用登録の申請に際して虚偽の事項を届け出た場合{'\n'}
                        （2）本規約に違反したことがある者からの申請である場合{'\n'}
                        （3）その他、当アプリが利用登録を相当でないと判断した場合
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第3条（ユーザーIDおよびパスワードの管理）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、自己の責任において、当アプリのユーザーIDおよびパスワードを適切に管理するものとします。ユーザーIDまたはパスワードが第三者に使用されたことによって生じた損害は、当アプリに故意または重大な過失がある場合を除き、当アプリは一切の責任を負わないものとします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第4条（利用料金および支払方法）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリの利用は、基本的に無料です。ただし、プレミアム機能については別途料金が発生する場合があります。料金の支払方法は、当アプリが指定する方法によります。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第5条（禁止事項）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、当アプリの利用にあたり、以下の行為をしてはなりません。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        （1）法令または公序良俗に違反する行為{'\n'}
                        （2）犯罪行為に関連する行為{'\n'}
                        （3）当アプリの内容等、当アプリの利用に関する一切の情報を複製、転載、改変等する行為{'\n'}
                        （4）当アプリの運営を妨害するおそれのある行為{'\n'}
                        （5）他のユーザーに関する個人情報等を収集または蓄積する行為{'\n'}
                        （6）不正アクセス、不正な方法による利用登録の申請等、当アプリの運営を妨害する行為{'\n'}
                        （7）その他、当アプリが不適切と判断する行為
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第6条（当アプリの提供の停止等）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく当アプリの全部または一部の提供を停止または中断することができるものとします。
                    </Text>
                    <Text style={[styles.listItem, { color: theme.colors.secondaryText }]}>
                        （1）当アプリにかかるコンピュータシステムの保守点検または更新を行う場合{'\n'}
                        （2）地震、落雷、火災、停電または天災などの不可抗力により、当アプリの提供が困難となった場合{'\n'}
                        （3）コンピュータまたは通信回線等が事故により停止した場合{'\n'}
                        （4）その他、当アプリが当アプリの提供が困難と判断した場合
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第7条（保証の否認および免責）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、当アプリに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。当アプリに起因してユーザーに生じたあらゆる損害について、当アプリは一切の責任を負いません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第8条（サービス内容の変更等）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあります。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第9条（利用規約の変更）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第10条（個人情報の取扱い）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        当アプリは、本サービスの利用によって取得する個人情報については、当アプリ「プライバシーポリシー」に従い適切に取り扱うものとします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第11条（通知または連絡）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーと当アプリとの間の通知または連絡は、当アプリの定める方法によって行うものとします。当アプリは、ユーザーから、当アプリが別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第12条（権利義務の譲渡の禁止）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        ユーザーは、当アプリの書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
                    </Text>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        第13条（準拠法・裁判管轄）
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                        本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当アプリの本店所在地を管轄する裁判所を専属的合意管轄とします。
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
