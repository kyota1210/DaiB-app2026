import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';
import { sendSystemNotification, getNotificationsLog } from '../api/notifications';

const MAX_TITLE  = 100;
const MAX_BODY   = 1000;

const AdminScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const [title, setTitle]     = useState('');
    const [body, setBody]       = useState('');
    const [sending, setSending] = useState(false);
    const [logs, setLogs]       = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);

    const loadLogs = useCallback(async () => {
        setLogsLoading(true);
        try {
            const data = await getNotificationsLog({ limit: 20 });
            setLogs(data);
        } catch (_) {
            // ログ取得失敗は無視
        } finally {
            setLogsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleSend = () => {
        const trimTitle = title.trim();
        const trimBody  = body.trim();

        if (!trimTitle) {
            Alert.alert(t('adminNotifErrorTitle'), t('adminNotifTitleRequired'));
            return;
        }
        if (!trimBody) {
            Alert.alert(t('adminNotifErrorTitle'), t('adminNotifBodyRequired'));
            return;
        }

        Alert.alert(
            t('adminNotifConfirmTitle'),
            t('adminNotifConfirmMessage'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('adminNotifSend'),
                    style: 'destructive',
                    onPress: async () => {
                        setSending(true);
                        try {
                            const result = await sendSystemNotification({ title: trimTitle, body: trimBody });
                            setTitle('');
                            setBody('');
                            await loadLogs();
                            Alert.alert(
                                t('adminNotifSentTitle'),
                                t('adminNotifSentMessage').replace('{{count}}', String(result.inserted ?? 0))
                            );
                        } catch (e) {
                            Alert.alert(t('adminNotifErrorTitle'), e?.message ?? t('adminNotifErrorGeneric'));
                        } finally {
                            setSending(false);
                        }
                    },
                },
            ]
        );
    };

    const styles = makeStyles(theme);

    const renderLogItem = ({ item }) => {
        const date = new Date(item.sent_at);
        const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        return (
            <View style={styles.logItem}>
                <View style={styles.logHeader}>
                    <Ionicons name="megaphone-outline" size={14} color={theme.textSecondary} />
                    <Text style={styles.logDate}>{dateStr}</Text>
                </View>
                <Text style={styles.logTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.logBody} numberOfLines={2}>{item.body}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScreenHeader title={t('adminTitle')} onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                    {/* 配信フォーム */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('adminNotifSectionNew')}</Text>

                        <Text style={styles.label}>{t('adminNotifLabelTitle')}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('adminNotifPlaceholderTitle')}
                                placeholderTextColor={theme.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={MAX_TITLE}
                                editable={!sending}
                            />
                            <Text style={styles.charCount}>{title.length}/{MAX_TITLE}</Text>
                        </View>

                        <Text style={styles.label}>{t('adminNotifLabelBody')}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder={t('adminNotifPlaceholderBody')}
                                placeholderTextColor={theme.textSecondary}
                                value={body}
                                onChangeText={setBody}
                                multiline
                                textAlignVertical="top"
                                maxLength={MAX_BODY}
                                editable={!sending}
                            />
                            <Text style={styles.charCount}>{body.length}/{MAX_BODY}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.sendButton, (sending || !title.trim() || !body.trim()) && styles.sendButtonDisabled]}
                            onPress={handleSend}
                            disabled={sending || !title.trim() || !body.trim()}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="megaphone-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.sendButtonText}>{t('adminNotifSend')}</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.noteBox}>
                            <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
                            <Text style={styles.noteText}>{t('adminNotifNote')}</Text>
                        </View>
                    </View>

                    {/* 配信履歴 */}
                    <View style={styles.section}>
                        <View style={styles.logHeaderRow}>
                            <Text style={styles.sectionTitle}>{t('adminNotifSectionHistory')}</Text>
                            <TouchableOpacity onPress={loadLogs}>
                                <Ionicons name="refresh-outline" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {logsLoading ? (
                            <ActivityIndicator style={{ marginTop: 16 }} color={theme.textSecondary} />
                        ) : logs.length === 0 ? (
                            <Text style={styles.emptyText}>{t('adminNotifHistoryEmpty')}</Text>
                        ) : (
                            logs.map((item) => (
                                <React.Fragment key={item.id}>
                                    {renderLogItem({ item })}
                                </React.Fragment>
                            ))
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const makeStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    section: {
        marginTop: 16,
        marginHorizontal: 16,
        backgroundColor: theme.card,
        borderRadius: 12,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.text,
        marginBottom: 6,
        marginTop: 8,
    },
    inputWrapper: {
        marginBottom: 4,
    },
    input: {
        backgroundColor: theme.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.text,
    },
    textArea: {
        height: 120,
        paddingTop: 10,
    },
    charCount: {
        fontSize: 11,
        color: theme.textSecondary,
        textAlign: 'right',
        marginTop: 3,
        marginBottom: 4,
    },
    sendButton: {
        marginTop: 12,
        backgroundColor: '#E53935',
        borderRadius: 10,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.45,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
        gap: 6,
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        color: theme.textSecondary,
        lineHeight: 18,
    },
    logHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    logItem: {
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
    },
    logHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3,
    },
    logDate: {
        fontSize: 11,
        color: theme.textSecondary,
    },
    logTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.text,
        marginBottom: 2,
    },
    logBody: {
        fontSize: 13,
        color: theme.textSecondary,
        lineHeight: 18,
    },
    emptyText: {
        fontSize: 14,
        color: theme.textSecondary,
        textAlign: 'center',
        paddingVertical: 20,
    },
});

export default AdminScreen;
