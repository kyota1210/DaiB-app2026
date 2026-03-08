import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const EmptyState = ({ icon, message }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            {icon && <Ionicons name={icon} size={48} color={theme.colors.inactive} />}
            <Text style={[styles.text, { color: theme.colors.secondaryText }]}>
                {message}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 14,
        marginTop: 8,
    },
});

export default EmptyState;
