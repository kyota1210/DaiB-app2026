import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { createReport } from '../api/moderation';

const REASONS = [
  { id: 'spam', labelKey: 'reportReasonSpam' },
  { id: 'abuse', labelKey: 'reportReasonAbuse' },
  { id: 'illegal', labelKey: 'reportReasonIllegal' },
  { id: 'other', labelKey: 'reportReasonOther' },
];

const ReportSheet = ({ visible, onClose, targetType, targetId, targetLabel }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [reason, setReason] = useState('spam');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason('spam');
    setDetail('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createReport({ target_type: targetType, target_id: targetId, reason, detail });
      reset();
      onClose?.();
      Alert.alert(t('completed'), t('reportSubmitted'));
    } catch (e) {
      Alert.alert(t('error'), e.message || t('reportFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={theme.colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('report')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {targetLabel ? (
              <Text style={[styles.target, { color: theme.colors.secondaryText }]}>
                {t('reportTarget')}: {targetLabel}
              </Text>
            ) : null}

            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('reportReasonLabel')}</Text>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.reasonRow, { borderColor: theme.colors.border, backgroundColor: reason === r.id ? theme.colors.secondaryBackground : 'transparent' }]}
                onPress={() => setReason(r.id)}
                disabled={submitting}
              >
                <Ionicons
                  name={reason === r.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={reason === r.id ? theme.colors.primary : theme.colors.inactive}
                />
                <Text style={[styles.reasonLabel, { color: theme.colors.text }]}>{t(r.labelKey)}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { color: theme.colors.text, marginTop: 20 }]}>{t('reportDetailLabel')}</Text>
            <TextInput
              style={[styles.detailInput, {
                backgroundColor: theme.colors.secondaryBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              value={detail}
              onChangeText={setDetail}
              placeholder={t('reportDetailPlaceholder')}
              placeholderTextColor={theme.colors.inactive}
              multiline
              maxLength={1000}
              editable={!submitting}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#FF3B30', opacity: submitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>{t('submitReport')}</Text>}
            </TouchableOpacity>

            <Text style={[styles.note, { color: theme.colors.inactive }]}>
              {t('reportNote')}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '600' },
  content: { padding: 20 },
  target: { fontSize: 13, marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, marginBottom: 8,
  },
  reasonLabel: { fontSize: 15, marginLeft: 10 },
  detailInput: {
    minHeight: 100, borderRadius: 8, borderWidth: 1, padding: 12, fontSize: 15, textAlignVertical: 'top',
  },
  submitButton: { marginTop: 24, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  note: { fontSize: 12, marginTop: 12, lineHeight: 18, textAlign: 'center' },
});

export default ReportSheet;
