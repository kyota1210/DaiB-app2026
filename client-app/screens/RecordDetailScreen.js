import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecordsApi } from '../api/records';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getImageUrl } from '../utils/imageHelper';
import { useFocusEffect } from '@react-navigation/native';

export default function RecordDetailScreen({ route, navigation }) {
    const { record: initialRecord } = route.params;
    const [record, setRecord] = useState(initialRecord);
    const [loading, setLoading] = useState(false);
    const [imageAspectRatio, setImageAspectRatio] = useState(1);
    const [showMenu, setShowMenu] = useState(false);
    const { deleteRecord, fetchRecordById } = useRecordsApi();
    const { theme } = useTheme();
    const { t } = useLanguage();

    // 画面が表示されるたびに最新データを取得
    useFocusEffect(
        useCallback(() => {
            const loadRecord = async () => {
                try {
                    const updatedRecord = await fetchRecordById(initialRecord.id);
                    setRecord(updatedRecord);
                } catch (error) {
                    console.error(t('recordFetchFailed'), error);
                }
            };
            loadRecord();
        }, [initialRecord.id, fetchRecordById, t])
    );

    // 画像の縦横比を取得
    const imageUrl = getImageUrl(record.image_url);
    
    React.useEffect(() => {
        if (imageUrl) {
            Image.getSize(
                imageUrl,
                (width, height) => {
                    setImageAspectRatio(width / height);
                },
                (error) => {
                    console.error(t('imageSizeFetchFailed'), error);
                    setImageAspectRatio(16 / 9); // デフォルト値
                }
            );
        }
    }, [imageUrl]);

    const handleDelete = () => {
        setShowMenu(false);
        Alert.alert(
            t('deleteConfirm'),
            t('削除します。よろしいですか？'),
            [
                { text: t('cancel') },
                {
                    text: t('delete'),
                    onPress: async () => {
                        try {
                            await deleteRecord(record.id);
                            navigation.goBack(); // 削除後に前の画面に戻る
                        } catch (error) {
                            Alert.alert(t('deleteFailed'), error.message);
                        }
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    const handleEdit = () => {
        setShowMenu(false);
        navigation.navigate('EditRecord', { record });
    };

    // 日付の表示形式を調整
    const date = new Date(record.date_logged);
    const dateString = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* ヘッダー */}
            <View style={[styles.header, { 
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border 
            }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text 
                    style={[styles.headerTitle, { color: theme.colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {record.title || ''}
                </Text>
                <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* 画像があれば表示、なければプレースホルダー */}
                {imageUrl ? (
                    <View style={[styles.imageContainer, { aspectRatio: imageAspectRatio }]}>
                        <Image source={{ uri: imageUrl }} style={styles.image} />
                    </View>
                ) : (
                    <View style={[styles.placeholderImageContainer, { backgroundColor: theme.colors.border }]}>
                        <Ionicons name="image-outline" size={80} color={theme.colors.inactive} />
                        <Text style={[styles.placeholderText, { color: theme.colors.inactive }]}>
                            {t('noImage')}
                        </Text>
                    </View>
                )}

                <View style={styles.infoContainer}>
                    <Text style={[styles.date, { color: theme.colors.secondaryText }]}>{dateString}</Text>
                    {record.description && (
                        <Text style={[styles.description, { color: theme.colors.secondaryText }]}>
                            {record.description}
                        </Text>
                    )}
                </View>
            </ScrollView>

            {/* メニューモーダル */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={[styles.menuContainer, { backgroundColor: theme.colors.card }]}>
                        <TouchableOpacity 
                            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
                            onPress={handleEdit}
                        >
                            <Ionicons name="pencil" size={22} color={theme.colors.primary} />
                            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                                {t('edit')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={handleDelete}
                        >
                            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>
                                {t('delete')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginHorizontal: 12,
    },
    menuButton: {
        padding: 4,
    },
    content: { 
        paddingBottom: 20 
    },
    imageContainer: {
        width: '100%',
        backgroundColor: '#000',
    },
    image: { 
        width: '100%', 
        height: '100%', 
        resizeMode: 'contain' 
    },
    placeholderImageContainer: {
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: { 
        marginTop: 10 
    },
    infoContainer: { padding: 20 },
    date: { 
        fontSize: 14, 
        marginBottom: 8 
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 16 
    },
    description: { 
        fontSize: 16, 
        lineHeight: 24 
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16,
    },
    menuContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        minWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    menuItemText: {
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
    },
});
