import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

const MODAL_CONFIG = {
    success: {
        icon: 'checkmark-circle',
        getColor: (theme) => theme.colors.primary,
    },
    error: {
        icon: 'close-circle',
        getColor: () => '#FF3B30',
        showButton: true,
    },
    confirm: {
        icon: 'trash-outline',
        getColor: () => '#FF3B30',
        showButtons: true,
    },
};

const ResultModal = ({
    type = 'success',
    visible,
    title,
    message,
    onClose,
    onConfirm,
    confirmLabel,
    cancelLabel,
    confirmIcon,
}) => {
    const { theme } = useTheme();
    const config = MODAL_CONFIG[type];
    const color = config.getColor(theme);
    const icon = confirmIcon || config.icon;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} tint="dark" style={styles.overlay}>
                <TouchableOpacity
                    style={styles.overlayTouchable}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
                        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                            <Ionicons name={icon} size={48} color={color} />
                        </View>
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {title}
                        </Text>
                        <Text style={[styles.message, { color: theme.colors.secondaryText, marginBottom: (config.showButton || config.showButtons) ? 24 : 0 }]}>
                            {message}
                        </Text>

                        {config.showButton && (
                            <TouchableOpacity
                                style={[styles.okButton, { backgroundColor: theme.colors.primary }]}
                                onPress={onClose}
                            >
                                <Text style={styles.okButtonText}>OK</Text>
                            </TouchableOpacity>
                        )}

                        {config.showButtons && (
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                                    onPress={onClose}
                                >
                                    <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                                        {cancelLabel || 'キャンセル'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={onConfirm}
                                >
                                    <Text style={styles.confirmButtonText}>
                                        {confirmLabel || '削除'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTouchable: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        minWidth: 280,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    okButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 20,
        minWidth: 120,
    },
    okButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ResultModal;
