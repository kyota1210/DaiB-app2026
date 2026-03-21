import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../utils/imageHelper';
import { recordDateKey } from '../utils/recordDateKey';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_PADDING = 1;
const COLUMN_WIDTH = (SCREEN_WIDTH - IMAGE_PADDING * 4) / 3;

LocaleConfig.locales.ja = {
    monthNames: [
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月',
    ],
    monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
    today: '今日',
};

export default function RecordCalendarSection({ records, theme, navigation, language, t }) {
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        LocaleConfig.defaultLocale = language === 'en' ? '' : 'ja';
    }, [language]);

    const markedDates = useMemo(() => {
        const marks = {};
        const dot = theme.colors.primary;
        for (const r of records || []) {
            const key = recordDateKey(r.date_logged);
            if (!key) continue;
            marks[key] = { marked: true, dotColor: dot };
        }
        if (selectedDate) {
            const prev = marks[selectedDate] || {};
            marks[selectedDate] = {
                ...prev,
                selected: true,
                selectedColor: theme.colors.primary,
                selectedTextColor: '#fff',
            };
        }
        return marks;
    }, [records, selectedDate, theme.colors.primary]);

    const dayRecords = useMemo(() => {
        if (!selectedDate) return [];
        const list = (records || []).filter((r) => recordDateKey(r.date_logged) === selectedDate);
        return [...list].sort((a, b) => {
            const ta = a.date_logged ? new Date(a.date_logged).getTime() : 0;
            const tb = b.date_logged ? new Date(b.date_logged).getTime() : 0;
            return tb - ta;
        });
    }, [records, selectedDate]);

    const calendarTheme = useMemo(() => ({
        backgroundColor: theme.colors.background,
        calendarBackground: theme.colors.card,
        textSectionTitleColor: theme.colors.secondaryText,
        monthTextColor: theme.colors.text,
        dayTextColor: theme.colors.text,
        textDisabledColor: theme.colors.inactive,
        todayTextColor: theme.colors.primary,
        arrowColor: theme.colors.icon,
        selectedDayBackgroundColor: theme.colors.primary,
        selectedDayTextColor: '#fff',
    }), [theme.colors]);

    const onDayPress = useCallback((day) => {
        setSelectedDate(day.dateString);
    }, []);

    const renderDayGrid = () => {
        if (!selectedDate) {
            return (
                <View style={styles.hintWrap}>
                    <Text style={[styles.hintText, { color: theme.colors.secondaryText }]}>
                        {t('calendarTapDayHint')}
                    </Text>
                </View>
            );
        }
        if (dayRecords.length === 0) {
            return (
                <View style={styles.hintWrap}>
                    <Text style={[styles.hintText, { color: theme.colors.secondaryText }]}>
                        {t('calendarNoPostsThisDay')}
                    </Text>
                </View>
            );
        }

        const rows = [];
        for (let i = 0; i < dayRecords.length; i += 3) {
            const rowItems = dayRecords.slice(i, i + 3);
            rows.push(
                <View key={`cal-row-${i}`} style={styles.rowContainer}>
                    {rowItems.map((item, index) => {
                        const itemIndex = i + index;
                        const imageUrl = getImageUrl(item.image_url);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.galleryCard, { marginRight: IMAGE_PADDING }]}
                                onPress={() => navigation.navigate('RecordDetail', {
                                    records: dayRecords,
                                    initialIndex: itemIndex,
                                })}
                                activeOpacity={0.9}
                            >
                                <View style={styles.imageContainer}>
                                    {imageUrl ? (
                                        <Image source={{ uri: imageUrl }} style={styles.galleryImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.imageContainer, styles.placeholder]}>
                                            <Ionicons name="image" size={30} color="#ccc" />
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
        }
        return rows;
    };

    return (
        <View style={styles.wrap}>
            <Calendar
                markedDates={markedDates}
                onDayPress={onDayPress}
                enableSwipeMonths={false}
                theme={calendarTheme}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.sectionLabel, { color: theme.colors.secondaryText }]}>
                {t('calendarDayPosts')}
            </Text>
            {renderDayGrid()}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 8,
        marginHorizontal: 8,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    hintWrap: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    rowContainer: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: IMAGE_PADDING,
    },
    galleryCard: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
