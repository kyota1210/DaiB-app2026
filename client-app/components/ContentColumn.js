import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
    CONTENT_MAX_WIDTH_MEDIA,
    CONTENT_MAX_WIDTH_FORM,
} from '../hooks/useContentWidth';

/**
 * 大画面でコンテンツを中央寄せし、maxWidth で幅を制限するラッパー。
 * スマホ幅では親の全幅を使うため見た目は変わらない。
 */
export default function ContentColumn({
    children,
    maxWidth = CONTENT_MAX_WIDTH_MEDIA,
    style,
    ...rest
}) {
    return (
        <View
            style={[styles.column, { maxWidth }, style]}
            {...rest}
        >
            {children}
        </View>
    );
}

export { CONTENT_MAX_WIDTH_MEDIA, CONTENT_MAX_WIDTH_FORM };

const styles = StyleSheet.create({
    column: {
        width: '100%',
        alignSelf: 'center',
    },
});
