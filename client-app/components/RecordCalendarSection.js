import React, { useMemo, useCallback, useEffect, createContext, useContext, memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, FlatList } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import XDate from 'xdate';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../utils/imageHelper';
import { recordDateKey } from '../utils/recordDateKey';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** 1週間分のセルをおおよそ正方形に（余白はカレンダー側 padding と margin で調整） */
const DAY_TILE_SIZE = Math.max(44, Math.floor((SCREEN_WIDTH - 28) / 7) - 4);

/** 月タイトル行の目安高さ（フォント・上下余白・曜日行との隙間を含む） */
const CALENDAR_MONTH_TITLE_EST = 76;
/** 曜日見出し行 */
const CALENDAR_WEEKDAY_HEADER_EST = 11;
/** 週行あたりの余白（main.week の marginVertical に合わせる） */
const WEEK_ROW_VERTICAL = 0;
/** item 高さが実表示より大きいと月の間に空きが出るため微調整で詰める */
const CALENDAR_MONTH_HEIGHT_TRIM = 22;
/** Calendar の firstDay（0=日曜）— 週行数計算と一致させる */
const CALENDAR_FIRST_DAY = 0;
const PAST_SCROLL_RANGE = 36;
const FUTURE_SCROLL_RANGE = 36;

/**
 * その月のカレンダーグリッドに必要な週の行数（react-native-calendars の表示と整合）
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @param {number} firstDayOfWeek 0-6
 */
function weekRowCountInMonth(year, monthIndex, firstDayOfWeek) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    let lead = firstWeekday - firstDayOfWeek;
    if (lead < 0) {
        lead += 7;
    }
    return Math.ceil((lead + daysInMonth) / 7);
}

function monthBlockHeightForWeekRows(weekRows) {
    return Math.max(
        CALENDAR_MONTH_TITLE_EST +
            CALENDAR_WEEKDAY_HEADER_EST +
            weekRows * (DAY_TILE_SIZE + WEEK_ROW_VERTICAL) -
            CALENDAR_MONTH_HEIGHT_TRIM,
        200
    );
}

function xDateToMarkingString(d) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** flex が効かない場合のビューポート最小高さ（最大週数を仮定） */
const CALENDAR_LIST_MIN_HEIGHT = Math.min(
    Math.round(SCREEN_HEIGHT * 0.58),
    Math.max(
        400,
        (CALENDAR_MONTH_TITLE_EST +
            CALENDAR_WEEKDAY_HEADER_EST +
            6 * (DAY_TILE_SIZE + WEEK_ROW_VERTICAL) -
            CALENDAR_MONTH_HEIGHT_TRIM) *
            2 +
            24
    )
);

const DayTileContext = createContext({
    postsByDay: {},
    appTheme: { colors: {} },
});

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

const CalendarDayTile = memo(function CalendarDayTile({
    date: dateData,
    state,
    marking,
    onPress,
    children,
    accessibilityLabel: a11yLabel,
    testID,
}) {
    const { postsByDay, appTheme } = useContext(DayTileContext);
    const dateString = dateData?.dateString;
    const entry = dateString ? postsByDay[dateString] : null;
    const hasPosts = entry && entry.count > 0;
    const coverUri = entry?.coverUri || null;

    const disabledVisual = state === 'disabled';
    const touchDisabled =
        marking?.disableTouchEvent === true ||
        marking?.disabled === true;

    const cellOpacity = disabledVisual ? 0.38 : 1;

    const handlePress = useCallback(() => {
        if (touchDisabled) return;
        onPress?.(dateData);
    }, [onPress, dateData, touchDisabled]);

    const dayLabel = children;

    const inner = hasPosts ? (
        <>
            {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.tileImage} resizeMode="cover" />
            ) : (
                <View style={[styles.tileImage, styles.placeholderFill, { backgroundColor: appTheme.colors.border }]}>
                    <Ionicons name="image-outline" size={20} color={appTheme.colors.inactive} />
                </View>
            )}
            <View style={styles.dayNumCentered} pointerEvents="none">
                <Text style={styles.dayNumText} numberOfLines={1}>
                    {dayLabel}
                </Text>
            </View>
            {entry.count > 1 ? (
                <View style={[styles.badge, { backgroundColor: appTheme.colors.primary }]}>
                    <Text style={styles.badgeText}>{String(entry.count)}</Text>
                </View>
            ) : null}
        </>
    ) : (
        <View style={styles.emptyFill}>
            <Text
                style={[
                    styles.emptyDayText,
                    { color: appTheme.colors.secondaryText },
                ]}
                numberOfLines={1}
            >
                {dayLabel}
            </Text>
        </View>
    );

    const todayRing =
        state === 'today'
            ? { borderWidth: 2, borderColor: appTheme.colors.primary }
            : { borderWidth: 0, borderColor: 'transparent' };

    const tileBg = { backgroundColor: 'transparent' };

    return (
        <View style={[styles.tileOuter, { opacity: cellOpacity }]}>
            <TouchableOpacity
                activeOpacity={0.85}
                disabled={touchDisabled}
                onPress={handlePress}
                accessibilityRole="button"
                accessibilityLabel={a11yLabel ?? dateString}
                testID={testID}
                style={[
                    styles.tileTouchable,
                    todayRing,
                    tileBg,
                ]}
            >
                {inner}
            </TouchableOpacity>
        </View>
    );
});

function buildPostsByDay(records) {
    const map = {};
    for (const r of records || []) {
        const key = recordDateKey(r.date_logged);
        if (!key) continue;
        if (!map[key]) map[key] = [];
        map[key].push(r);
    }
    for (const key of Object.keys(map)) {
        const list = map[key];
        list.sort((a, b) => {
            const ta = a.date_logged ? new Date(a.date_logged).getTime() : 0;
            const tb = b.date_logged ? new Date(b.date_logged).getTime() : 0;
            return tb - ta;
        });
        const coverRecord = list.find((rec) => getImageUrl(rec.image_url)) || list[0];
        const coverUri = coverRecord ? getImageUrl(coverRecord.image_url) : null;
        map[key] = {
            records: list,
            coverUri,
            count: list.length,
        };
    }
    return map;
}

function formatDateString(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** カレンダー見出し: 日本語は YYYY年M月、英語はロケールの月名 */
function formatCalendarMonthTitle(monthXDate, language) {
    if (!monthXDate) return '';
    const y = monthXDate.getFullYear();
    const mo = monthXDate.getMonth() + 1;
    if (language === 'en') {
        const d = new Date(y, mo - 1, 1);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return `${y}年${mo}月`;
}

export default function RecordCalendarSection({
    records,
    theme,
    navigation,
    language,
    /** 親から渡す表示領域の高さ（横 ScrollView 内では必須に近い） */
    containerHeight,
}) {
    useEffect(() => {
        LocaleConfig.defaultLocale = language === 'en' ? '' : 'ja';
    }, [language]);

    const currentMonthStr = useMemo(() => formatDateString(new Date()), []);

    const postsByDay = useMemo(() => buildPostsByDay(records), [records]);

    const dayContextValue = useMemo(
        () => ({ postsByDay, appTheme: theme }),
        [postsByDay, theme]
    );

    const calendarTheme = useMemo(
        () => ({
            backgroundColor: theme.colors.background,
            calendarBackground: theme.colors.card,
            textSectionTitleColor: theme.colors.secondaryText,
            monthTextColor: theme.colors.text,
            dayTextColor: theme.colors.text,
            textDisabledColor: theme.colors.inactive,
            todayTextColor: theme.colors.primary,
            arrowColor: theme.colors.icon,
            weekVerticalMargin: 0,
            textMonthFontSize: 20,
            textMonthFontWeight: '400',
            textDayHeaderFontSize: 12,
            textDayHeaderFontWeight: '600',
            'stylesheet.calendar.header': {
                header: {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                    marginBottom: 0,
                    paddingLeft: 4,
                    paddingRight: 4,
                    paddingTop: 16,
                    paddingBottom: 8,
                },
                monthText: {
                    marginVertical: 0,
                    marginHorizontal: 2,
                },
                /** 日セル行と同じく 7 等分で曜日を並べる（既定 width:32 だと列がずれる） */
                week: {
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    marginTop: 6,
                    marginBottom: 0,
                    paddingHorizontal: 0,
                    width: '100%',
                },
                dayHeader: {
                    flex: 1,
                    marginTop: 0,
                    marginBottom: 0,
                    paddingVertical: 0,
                    textAlign: 'center',
                    fontSize: 12,
                    lineHeight: 14,
                    fontWeight: '600',
                    color: theme.colors.secondaryText,
                },
            },
            'stylesheet.calendar.main': {
                container: {
                    paddingLeft: 0,
                    paddingRight: 0,
                },
                monthView: {
                    paddingBottom: 0,
                    marginBottom: 0,
                },
                /** flex:1 の日セルと同じ配分（space-around だと曜日行とずれることがある） */
                week: {
                    marginVertical: 0,
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    paddingHorizontal: 0,
                },
            },
        }),
        [theme.colors]
    );

    const monthListAnchorRef = useRef(null);
    if (monthListAnchorRef.current === null) {
        monthListAnchorRef.current = new XDate(currentMonthStr, true);
    }

    const listMonths = useMemo(() => {
        const anchor = monthListAnchorRef.current;
        const out = [];
        for (let i = 0; i <= PAST_SCROLL_RANGE + FUTURE_SCROLL_RANGE; i++) {
            out.push(anchor.clone().addMonths(i - PAST_SCROLL_RANGE, true));
        }
        return out;
    }, []);

    const { monthHeights, monthOffsets } = useMemo(() => {
        const heights = listMonths.map((m) =>
            monthBlockHeightForWeekRows(
                weekRowCountInMonth(m.getFullYear(), m.getMonth(), CALENDAR_FIRST_DAY)
            )
        );
        const offsets = [];
        let acc = 0;
        for (let i = 0; i < heights.length; i++) {
            offsets.push(acc);
            acc += heights[i];
        }
        return { monthHeights: heights, monthOffsets: offsets };
    }, [listMonths]);

    const getItemLayout = useCallback(
        (_, index) => ({
            length: monthHeights[index],
            offset: monthOffsets[index],
            index,
        }),
        [monthHeights, monthOffsets]
    );

    const monthListRef = useRef(null);

    const onScrollToIndexFailed = useCallback((info) => {
        setTimeout(() => {
            monthListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
            });
        }, 120);
    }, []);

    const onDayPress = useCallback(
        (day) => {
            const entry = postsByDay[day.dateString];
            if (entry?.records?.length) {
                navigation.navigate('RecordDetail', {
                    records: entry.records,
                    initialIndex: 0,
                });
            }
        },
        [postsByDay, navigation]
    );

    const renderCalendarHeader = useCallback(
        (month, { testID: headerTestId } = {}) => (
            <Text
                allowFontScaling={false}
                style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: theme.colors.text,
                    marginVertical: 2,
                    marginHorizontal: 2,
                    lineHeight: 24,
                    includeFontPadding: false,
                }}
                testID={headerTestId ? `${headerTestId}.title` : undefined}
            >
                {formatCalendarMonthTitle(month, language)}
            </Text>
        ),
        [language, theme.colors.text]
    );

    const renderMonthItem = useCallback(
        ({ item, index }) => {
            const h = monthHeights[index];
            const dateStr = xDateToMarkingString(item);
            return (
                <View style={{ height: h, width: SCREEN_WIDTH }}>
                    <Calendar
                        current={dateStr}
                        firstDay={CALENDAR_FIRST_DAY}
                        hideArrows
                        hideExtraDays
                        disableMonthChange
                        theme={calendarTheme}
                        dayComponent={CalendarDayTile}
                        onDayPress={onDayPress}
                        renderHeader={renderCalendarHeader}
                        style={{
                            width: SCREEN_WIDTH,
                            minHeight: h,
                            paddingLeft: 2,
                            paddingRight: 2,
                        }}
                    />
                </View>
            );
        },
        [monthHeights, calendarTheme, onDayPress, renderCalendarHeader]
    );

    const outerHeight =
        containerHeight != null && containerHeight > 0
            ? containerHeight
            : CALENDAR_LIST_MIN_HEIGHT;
    const listViewportHeight = Math.max(outerHeight, 120);

    return (
        <DayTileContext.Provider value={dayContextValue}>
            <View style={[styles.wrap, { height: outerHeight }]}>
                <View style={[styles.calendarListViewport, { height: listViewportHeight }]}>
                    <FlatList
                        ref={monthListRef}
                        data={listMonths}
                        keyExtractor={(item) => xDateToMarkingString(item)}
                        renderItem={renderMonthItem}
                        getItemLayout={getItemLayout}
                        initialScrollIndex={PAST_SCROLL_RANGE}
                        initialNumToRender={5}
                        windowSize={7}
                        maxToRenderPerBatch={8}
                        removeClippedSubviews={false}
                        showsVerticalScrollIndicator
                        scrollEnabled
                        nestedScrollEnabled
                        onScrollToIndexFailed={onScrollToIndexFailed}
                        style={{ height: listViewportHeight, width: SCREEN_WIDTH }}
                    />
                </View>
            </View>
        </DayTileContext.Provider>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%',
    },
    calendarListViewport: {
        width: '100%',
    },
    tileOuter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileTouchable: {
        width: DAY_TILE_SIZE,
        height: DAY_TILE_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
    },
    tileImage: {
        ...StyleSheet.absoluteFillObject,
    },
    placeholderFill: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayNumCentered: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayNumText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.65)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    badge: {
        position: 'absolute',
        right: 3,
        bottom: 3,
        minWidth: 18,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    emptyFill: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyDayText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
