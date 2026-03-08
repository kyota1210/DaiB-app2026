import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl } from '../utils/imageHelper';

const UserRow = ({
    user,
    onPress,
    onFollowPress,
    showFollowButton = false,
    isFollowing = false,
    isBusy = false,
    followLabel,
    unfollowLabel,
}) => {
    const { theme } = useTheme();
    const avatarUrl = getImageUrl(user.avatar_url);

    const avatar = avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
    ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.border }]}>
            <Ionicons name="person" size={24} color={theme.colors.inactive} />
        </View>
    );

    const info = (
        <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                {user.user_name || ''}
            </Text>
            {user.bio ? (
                <Text style={[styles.bio, { color: theme.colors.secondaryText }]} numberOfLines={2}>
                    {user.bio}
                </Text>
            ) : null}
        </View>
    );

    const followButton = showFollowButton ? (
        <TouchableOpacity
            style={[
                styles.followButton,
                { backgroundColor: isFollowing ? theme.colors.secondaryBackground : theme.colors.primary },
            ]}
            onPress={onFollowPress}
            disabled={isBusy}
        >
            {isBusy ? (
                <ActivityIndicator size="small" color={isFollowing ? theme.colors.text : '#fff'} />
            ) : (
                <Text style={[styles.followButtonText, { color: isFollowing ? theme.colors.text : '#fff' }]}>
                    {isFollowing ? (unfollowLabel || 'Unfollow') : (followLabel || 'Follow')}
                </Text>
            )}
        </TouchableOpacity>
    ) : null;

    return (
        <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
            {onPress ? (
                <TouchableOpacity style={styles.rowLeft} onPress={onPress} activeOpacity={0.7}>
                    {avatar}
                    {info}
                </TouchableOpacity>
            ) : (
                <>
                    {avatar}
                    {info}
                </>
            )}
            {followButton}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    bio: {
        fontSize: 12,
        marginTop: 2,
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UserRow;
