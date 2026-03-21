import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../utils/imageHelper';
import { recordDateKey } from '../utils/recordDateKey';

const THUMB = 56;
const THUMB_GAP = 8;
const MONTH_LABEL_W = 44;
/** タブ選択・ヒートマップ最大色と揃えたアクセント（primary の青は使わない） */
const CHRONOMAP_AXIS_COLOR = '#4E5F5C';
const MONTH_INDENT_FROM_YEAR = 18;
const YEAR_TITLE_PADDING_LEFT = 14;

function formatYearLabel(year, language) {
    return language === 'en' ? String(year) : `${year}年`;
}

function formatMonthLabel(month, language) {
    if (language === 'en') {
        const d = new Date(2000, month - 1, 1);
        return d.toLocaleDateString('en-US', { month: 'short' });
    }
    return `${month}月`;
}

function formatDayLabel(day, language) {
    return language === 'en' ? String(day) : `${day}日`;
}

/**
 * 年（新しい順）→ 月（新しい順）→ 日（新しい順）→ 同日は投稿時刻の新しい順
 */
function buildChronomapTree(records) {
    const yMap = new Map();

    for (const r of records || []) {
        const k = recordDateKey(r.date_logged);
        if (!k) continue;
        const [ys, ms, ds] = k.split('-');
        const y = parseInt(ys, 10);
        const m = parseInt(ms, 10);
        const d = parseInt(ds, 10);
        if (!yMap.has(y)) yMap.set(y, new Map());
        const mMap = yMap.get(y);
        if (!mMap.has(m)) mMap.set(m, new Map());
        const dMap = mMap.get(m);
        if (!dMap.has(d)) dMap.set(d, []);
        dMap.get(d).push(r);
    }

    for (const mMap of yMap.values()) {
        for (const dMap of mMap.values()) {
            for (const arr of dMap.values()) {
                arr.sort((a, b) => {
                    const ta = a.date_logged ? new Date(a.date_logged).getTime() : 0;
                    const tb = b.date_logged ? new Date(b.date_logged).getTime() : 0;
                    return tb - ta;
                });
            }
        }
    }

    const years = [...yMap.keys()].sort((a, b) => b - a);
    const tree = years.map((year) => {
        const mMap = yMap.get(year);
        const months = [...mMap.keys()].sort((a, b) => b - a);
        return {
            year,
            months: months.map((month) => {
                const dMap = mMap.get(month);
                const days = [...dMap.keys()].sort((a, b) => b - a);
                return {
                    month,
                    days: days.map((day) => ({
                        day,
                        records: dMap.get(day),
                    })),
                };
            }),
        };
    });

    const flatList = [];
    for (const yb of tree) {
        for (const mb of yb.months) {
            for (const db of mb.days) {
                for (const rec of db.records) {
                    flatList.push(rec);
                }
            }
        }
    }

    const indexById = new Map();
    flatList.forEach((rec, i) => indexById.set(rec.id, i));

    return { tree, flatList, indexById };
}

export default function RecordLifeTimelineSection({ records, theme, navigation, language = 'ja', t }) {
    const { tree, flatList, indexById } = useMemo(() => buildChronomapTree(records), [records]);

    if (flatList.length === 0) {
        return (
            <View style={styles.emptyWrap}>
                <Ionicons name="git-branch-outline" size={48} color={theme.colors.border} />
                <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>
                    {t('lifeTimelineNoDates')}
                </Text>
            </View>
        );
    }

    const axisColor = CHRONOMAP_AXIS_COLOR;

    const renderThumb = (item) => {
        const imageUrl = getImageUrl(item.image_url);
        const initialIndex = indexById.get(item.id) ?? 0;
        return (
            <TouchableOpacity
                key={item.id}
                style={styles.thumbWrap}
                onPress={() =>
                    navigation.navigate('RecordDetail', {
                        records: flatList,
                        initialIndex,
                    })
                }
                activeOpacity={0.85}
            >
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={[styles.thumb, { backgroundColor: theme.colors.secondaryBackground }]}
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        style={[
                            styles.thumb,
                            styles.thumbPlaceholder,
                            { backgroundColor: theme.colors.secondaryBackground },
                        ]}
                    >
                        <Ionicons name="image" size={24} color={theme.colors.inactive} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.wrap}>
            {tree.map((yearBlock) => (
                <View key={yearBlock.year} style={styles.yearSection}>
                    <Text style={[styles.yearTitle, { color: theme.colors.text }]}>
                        {formatYearLabel(yearBlock.year, language)}
                    </Text>
                    <View style={styles.monthsUnderYear}>
                    {yearBlock.months.map((monthBlock) => (
                        <View key={`${yearBlock.year}-${monthBlock.month}`} style={styles.monthRow}>
                            <View style={[styles.monthLabelCol, { width: MONTH_LABEL_W }]}>
                                <Text style={[styles.monthLabel, { color: theme.colors.text }]}>
                                    {formatMonthLabel(monthBlock.month, language)}
                                </Text>
                            </View>
                            <View style={styles.monthConnectorWrap}>
                                <View style={[styles.monthHConnector, { backgroundColor: axisColor }]} />
                            </View>
                            <View
                                style={[
                                    styles.monthContent,
                                    {
                                        borderLeftColor: axisColor,
                                    },
                                ]}
                            >
                                {monthBlock.days.map((dayBlock) => (
                                    <View key={`${yearBlock.year}-${monthBlock.month}-${dayBlock.day}`} style={styles.dayBlock}>
                                        <View style={styles.dayLabelCol}>
                                            <Text
                                                style={[styles.dayLabel, { color: theme.colors.secondaryText }]}
                                            >
                                                {formatDayLabel(dayBlock.day, language)}
                                            </Text>
                                        </View>
                                        <View style={styles.thumbRow}>
                                            {dayBlock.records.map((rec) => renderThumb(rec))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { width: '100%', paddingBottom: 20 },
    yearSection: {
        marginBottom: 20,
    },
    monthsUnderYear: {
        marginLeft: MONTH_INDENT_FROM_YEAR,
    },
    yearTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 14,
        paddingLeft: YEAR_TITLE_PADDING_LEFT,
        paddingRight: 4,
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    monthLabelCol: {
        paddingTop: 2,
        paddingRight: 6,
        justifyContent: 'flex-start',
    },
    monthLabel: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'right',
    },
    monthConnectorWrap: {
        width: 14,
        alignSelf: 'flex-start',
        paddingTop: 2,
        height: 24,
        justifyContent: 'center',
    },
    monthHConnector: {
        height: 2,
        width: 14,
        borderRadius: 1,
    },
    monthContent: {
        flex: 1,
        borderLeftWidth: 2,
        paddingLeft: 12,
        paddingVertical: 4,
        paddingRight: 8,
        borderRadius: 0,
        minWidth: 0,
    },
    dayBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    dayLabelCol: {
        width: 45,
        paddingRight: 10,
        paddingTop: 4,
        justifyContent: 'flex-start',
    },
    dayLabel: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
    },
    thumbRow: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: THUMB_GAP,
        minWidth: 0,
    },
    thumbWrap: {
        marginRight: 0,
        marginBottom: 0,
    },
    thumb: {
        width: THUMB,
        height: THUMB,
        borderRadius: 8,
        overflow: 'hidden',
    },
    thumbPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
