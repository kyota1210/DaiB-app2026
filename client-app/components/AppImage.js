import React, { useEffect, useState, useCallback } from 'react';
import { Image } from 'expo-image';

/**
 * アプリ内のリモート画像表示の共通コンポーネント。
 *
 * - expo-image のメモリ + ディスクキャッシュを常に有効にする（RN の Image は
 *   iOS だと NSURLCache 依存で、オリジンの Cache-Control 次第で毎回再取得になっていた）
 * - リストで使い回されるビューに前の画像が残らないよう recyclingKey を uri に紐づける
 * - fallbackUri を渡すと、読み込み失敗時に一度だけそちらへ切り替える。
 *   サムネイル未生成（バックフィル前）の投稿画像を原画像で表示するために使う
 *
 * resizeMode は react-native の Image からの移行用に受け付け、contentFit に読み替える。
 */
const RESIZE_MODE_TO_CONTENT_FIT = {
    cover: 'cover',
    contain: 'contain',
    stretch: 'fill',
    center: 'none',
    repeat: 'cover',
};

export default function AppImage({
    source,
    uri: uriProp,
    fallbackUri,
    resizeMode,
    contentFit,
    transition = 0,
    priority,
    onLoad,
    onError,
    // react-native の Image 固有プロパティ。expo-image では transition が担うので捨てる
    fadeDuration: _fadeDuration,
    ...rest
}) {
    const primaryUri = uriProp ?? (typeof source === 'object' && source !== null ? source.uri : source);
    const [activeUri, setActiveUri] = useState(primaryUri);

    useEffect(() => {
        setActiveUri(primaryUri);
    }, [primaryUri]);

    const handleError = useCallback(
        (event) => {
            if (fallbackUri && activeUri !== fallbackUri) {
                setActiveUri(fallbackUri);
                return;
            }
            onError?.(event);
        },
        [fallbackUri, activeUri, onError]
    );

    // 画像サイズを onLoad で読む既存コードのために、react-native の
    // event.nativeEvent.source と同じ形を作って渡す。
    const handleLoad = useCallback(
        (event) => {
            if (!onLoad) return;
            const { width = 0, height = 0 } = event?.source ?? {};
            onLoad({ ...event, nativeEvent: { source: { width, height } } });
        },
        [onLoad]
    );

    const resolvedContentFit = contentFit ?? RESIZE_MODE_TO_CONTENT_FIT[resizeMode] ?? 'cover';

    return (
        <Image
            source={activeUri ? { uri: activeUri } : null}
            recyclingKey={primaryUri || undefined}
            cachePolicy="memory-disk"
            contentFit={resolvedContentFit}
            transition={transition}
            priority={priority}
            onLoad={onLoad ? handleLoad : undefined}
            onError={handleError}
            {...rest}
        />
    );
}
