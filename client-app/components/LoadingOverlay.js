import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LoadingOverlay = () => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default LoadingOverlay;
