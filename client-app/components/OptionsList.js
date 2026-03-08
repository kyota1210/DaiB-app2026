import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const OptionsList = ({ options, selectedId, onSelect }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {options.map((option, index) => {
                const isSelected = selectedId === option.id;
                const isLast = index === options.length - 1;

                return (
                    <TouchableOpacity
                        key={option.id}
                        style={[
                            styles.item,
                            !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                        ]}
                        onPress={() => onSelect(option.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons
                                name={option.icon}
                                size={28}
                                color={isSelected ? theme.colors.primary : theme.colors.icon}
                            />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.title, { color: theme.colors.text }]}>
                                {option.title}
                            </Text>
                            {option.description ? (
                                <Text style={[styles.description, { color: theme.colors.secondaryText }]}>
                                    {option.description}
                                </Text>
                            ) : null}
                        </View>
                        {isSelected && (
                            <View style={styles.checkmark}>
                                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
    },
    checkmark: {
        marginLeft: 12,
    },
});

export default OptionsList;
