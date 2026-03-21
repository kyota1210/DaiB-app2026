import React, { useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Dimensions,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../utils/imageHelper';
import { recordDateKey } from '../utils/recordDateKey';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_PADDING = 1;
const COLUMN_WIDTH = (SCREEN_WIDTH - IMAGE_PADDING * 4) / 3;
/** ヒートマップ最大値の色（ダークグリーン） */
const HEATMAP_MAX_GREEN = '#4E5F5C';
/** 横スクロールなしで見える週数の目安（約3か月） */
const TARGET_VISIBLE_WEEKS = 13;
/** 月行・グリッド行の paddingHorizontal 4+4 に合わせた余白 */
const HEATMAP_GRID_H_PADDING = 8;
/** RecordListScreen の scrollContent（IMAGE_PADDING）左右分 */
const PARENT_SCROLL_H_PAD = 2;
const CELL_GAP = 4;
const MONTH_LABEL_HEIGHT = 22;
const MIN_WEEK_COL_W = 18;
const MAX_WEEK_COL_W = 36;

function computeWeekColumnWidth(windowWidth) {
    const avail = Math.max(0, windowWidth - HEATMAP_GRID_H_PADDING - PARENT_SCROLL_H_PAD);
    const n = TARGET_VISIBLE_WEEKS;
    const gaps = (n - 1) * CELL_GAP;
    const raw = Math.floor((avail - gaps) / n);
    return Math.min(MAX_WEEK_COL_W, Math.max(MIN_WEEK_COL_W, raw));
}

/** @returns {{ dateString: string, inYear: boolean, count: number }[][]} columns of 7 cells (Sun–Sat) */
function buildYearWeekColumns(year, countsByDate) {
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const start = new Date(jan1);
    start.setDate(start.getDate() - start.getDay());

    const end = new Date(dec31);
    while (end.getDay() !== 6) {
        end.setDate(end.getDate() + 1);
    }

    const weeks = [];
    const cur = new Date(start);
    while (cur <= end) {
        const col = [];
        for (let i = 0; i < 7; i++) {
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            const d = String(cur.getDate()).padStart(2, '0');
            const ds = `${y}-${m}-${d}`;
            const inYear = y === year;
            const count = inYear ? countsByDate[ds] || 0 : 0;
            col.push({ dateString: ds, inYear, count });
            cur.setDate(cur.getDate() + 1);
        }
        weeks.push(col);
    }
    return weeks;
}

function heatLevel(count, maxCount) {
    if (count <= 0) return 0;
    if (maxCount <= 1) return 4;
    const t = count / maxCount;
    if (t <= 0.25) return 1;
    if (t <= 0.5) return 2;
    if (t <= 0.75) return 3;
    return 4;
}

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')}`;
}

/** level 1〜4 を薄い緑から HEATMAP_MAX_GREEN へ線形補間 */
function heatmapGreenForLevel(level) {
    if (level <= 0) return null;
    const max = hexToRgb(HEATMAP_MAX_GREEN);
    const min = { r: 232, g: 244, b: 239 };
    const t = level / 4;
    return rgbToHex(
        Math.round(min.r + (max.r - min.r) * t),
        Math.round(min.g + (max.g - min.g) * t),
        Math.round(min.b + (max.b - min.b) * t)
    );
}

/** その週列に月の1日が含まれる場合、月の短縮名（ロケール対応） */
function monthLabelForWeekColumn(columnCells, language) {
    const locale = language === 'en' ? 'en-US' : 'ja-JP';
    for (const cell of columnCells) {
        if (!cell.inYear) continue;
        const d = new Date(`${cell.dateString}T12:00:00`);
        if (d.getDate() === 1) {
            return d.toLocaleDateString(locale, { month: 'short' });
        }
    }
    return '';
}

export default function RecordHeatmapSection({ records, theme, navigation, language = 'ja', t }) {
    const { width: windowWidth } = useWindowDimensions();
    const weekColW = useMemo(() => computeWeekColumnWidth(windowWidth), [windowWidth]);

    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [selectedDate, setSelectedDate] = useState(null);

    const countsByDate = useMemo(() => {
        const m = {};
        for (const r of records || []) {
            const k = recordDateKey(r.date_logged);
            if (!k) continue;
            m[k] = (m[k] || 0) + 1;
        }
        return m;
    }, [records]);

    const maxInYear = useMemo(() => {
        let max = 0;
        for (const [ds, c] of Object.entries(countsByDate)) {
            if (parseInt(ds.slice(0, 4), 10) === year) {
                max = Math.max(max, c);
            }
        }
        return max;
    }, [countsByDate, year]);

    const weekColumns = useMemo(() => buildYearWeekColumns(year, countsByDate), [year, countsByDate]);

    const dayRecords = useMemo(() => {
        if (!selectedDate) return [];
        const list = (records || []).filter((r) => recordDateKey(r.date_logged) === selectedDate);
        return [...list].sort((a, b) => {
            const ta = a.date_logged ? new Date(a.date_logged).getTime() : 0;
            const tb = b.date_logged ? new Date(b.date_logged).getTime() : 0;
            return tb - ta;
        });
    }, [records, selectedDate]);

    const onCellPress = useCallback((cell) => {
        if (!cell.inYear) return;
        setSelectedDate(cell.dateString);
    }, []);

    const renderDayGrid = () => {
        if (!selectedDate) {
            return (
                <View style={styles.hintWrap}>
                    <Text style={[styles.hintText, { color: theme.colors.secondaryText }]}>
                        {t('heatmapTapDayHint')}
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
                <View key={`hm-row-${i}`} style={styles.rowContainer}>
                    {rowItems.map((item, index) => {
                        const itemIndex = i + index;
                        const imageUrl = getImageUrl(item.image_url);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.galleryCard, { marginRight: IMAGE_PADDING }]}
                                onPress={() =>
                                    navigation.navigate('RecordDetail', {
                                        records: dayRecords,
                                        initialIndex: itemIndex,
                                    })
                                }
                                activeOpacity={0.9}
                            >
                                <View style={styles.imageContainer}>
                                    {imageUrl ? (
                                        <Image
                                            source={{ uri: imageUrl }}
                                            style={styles.galleryImage}
                                            resizeMode="cover"
                                        />
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
            <View style={styles.yearRow}>
                <TouchableOpacity
                    onPress={() => setYear((y) => y - 1)}
                    style={styles.yearArrow}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={22} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.yearText, { color: theme.colors.text }]}>
                    {t('heatmapForYear').replace('{{year}}', String(year))}
                </Text>
                <TouchableOpacity
                    onPress={() => setYear((y) => y + 1)}
                    style={styles.yearArrow}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-forward" size={22} color={theme.colors.icon} />
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gridScroll}
                contentContainerStyle={styles.gridScrollContent}
            >
                <View>
                    <View style={styles.monthRow}>
                        {weekColumns.map((col, wi) => {
                            const label = monthLabelForWeekColumn(col, language);
                            return (
                                <View
                                    key={`m-${wi}`}
                                    style={[styles.monthCol, { width: weekColW, marginRight: CELL_GAP }]}
                                >
                                    <Text style={[styles.monthText, { color: theme.colors.secondaryText }]}>
                                        {label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                    <View style={styles.gridRow}>
                        {weekColumns.map((col, wi) => (
                            <View key={`w-${wi}`} style={[styles.weekCol, { width: weekColW, marginRight: CELL_GAP }]}>
                                {col.map((cell, di) => {
                                    const selected = selectedDate === cell.dateString;
                                    const lv = cell.inYear ? heatLevel(cell.count, maxInYear || 1) : 0;
                                    const fillColor = heatmapGreenForLevel(lv);
                                    return (
                                        <TouchableOpacity
                                            key={cell.dateString + di}
                                            activeOpacity={cell.inYear ? 0.7 : 1}
                                            onPress={() => onCellPress(cell)}
                                            disabled={!cell.inYear}
                                            style={[
                                                styles.cell,
                                                {
                                                    width: weekColW,
                                                    height: weekColW,
                                                    backgroundColor: cell.inYear
                                                        ? fillColor
                                                            ? fillColor
                                                            : theme.colors.secondaryBackground
                                                        : 'transparent',
                                                    borderColor: selected
                                                        ? HEATMAP_MAX_GREEN
                                                        : theme.colors.border,
                                                    borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                                                },
                                            ]}
                                        />
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.legendRow, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.legendLabel, { color: theme.colors.secondaryText }]}>
                    {t('heatmapLess')}
                </Text>
                {[0, 1, 2, 3, 4].map((lv) => {
                    const c = heatmapGreenForLevel(lv);
                    const leg = Math.max(12, Math.min(18, Math.round(weekColW * 0.48)));
                    return (
                        <View
                            key={lv}
                            style={[
                                styles.legendCell,
                                {
                                    width: leg,
                                    height: leg,
                                    backgroundColor: c || theme.colors.secondaryBackground,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                        />
                    );
                })}
                <Text style={[styles.legendLabel, { color: theme.colors.secondaryText }]}>
                    {t('heatmapMore')}
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.sectionLabel, { color: theme.colors.secondaryText }]}>
                {t('calendarDayPosts')}
            </Text>
            {renderDayGrid()}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { width: '100%' },
    yearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 16,
    },
    yearArrow: { padding: 4 },
    yearText: { fontSize: 17, fontWeight: '700', minWidth: 120, textAlign: 'center' },
    gridScroll: { marginBottom: 8 },
    gridScrollContent: {
        flexGrow: 1,
        paddingVertical: 2,
    },
    monthRow: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        minHeight: MONTH_LABEL_HEIGHT,
        marginBottom: 4,
        alignItems: 'flex-end',
    },
    monthCol: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'visible',
    },
    monthText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
    },
    gridRow: { flexDirection: 'row', paddingHorizontal: 4 },
    weekCol: {},
    cell: {
        borderRadius: 3,
        marginBottom: CELL_GAP,
        overflow: 'hidden',
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 4,
        paddingTop: 10,
        marginTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    legendLabel: { fontSize: 11, marginHorizontal: 4 },
    legendCell: {
        borderRadius: 3,
        borderWidth: StyleSheet.hairlineWidth,
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
    hintWrap: { paddingVertical: 24, alignItems: 'center' },
    hintText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 16 },
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
