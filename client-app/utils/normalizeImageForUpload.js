import * as ImageManipulator from 'expo-image-manipulator';

/** 詳細/スレッドの全幅表示用。3x 端末の実表示幅（約 1170px）を上回る長辺 */
export const POST_MAIN_LONG_EDGE = 1440;
/** グリッド・カレンダー・タイムライン用サムネイルの長辺 */
export const POST_THUMB_LONG_EDGE = 480;
/** アバターの長辺。最大用途は THUMB_AVATAR_PROFILE = 256px */
export const AVATAR_LONG_EDGE = 320;

const QUALITY_MAIN = 0.82;
const QUALITY_THUMB = 0.72;
const QUALITY_AVATAR = 0.8;

/** 長辺を longEdge 以下に収める resize アクション。元画像より大きくは拡大しない */
const resizeActions = (width, height, longEdge) => {
  if (!longEdge || !width || !height) return [];
  if (Math.max(width, height) <= longEdge) return [];
  return [width >= height ? { resize: { width: longEdge } } : { resize: { height: longEdge } }];
};

const encodeJpeg = async (uri, actions, compress) => {
  const manipulated = await ImageManipulator.manipulateAsync(uri, actions, {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();
  return {
    arrayBuffer,
    contentType: 'image/jpeg',
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
  };
};

/** ピッカーが width/height を返さなかった場合のみ実寸を取得する */
const ensureSize = async (uri, width, height) => {
  if (width > 0 && height > 0) return { width, height };
  const probe = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { width: probe.width, height: probe.height };
};

/**
 * Re-encode picker output (HEIC/PNG/etc.) to JPEG for Storage; fixes wrong Content-Type / HEIC in browsers.
 * longEdge を渡すと長辺をその値以下に縮小する。
 */
export async function imageUriToJpegArrayBuffer(uri, { compress = QUALITY_AVATAR, longEdge = null, width = 0, height = 0 } = {}) {
  if (!uri) throw new Error('画像 URIがありません。');
  let actions = [];
  if (longEdge) {
    const size = await ensureSize(uri, width, height);
    actions = resizeActions(size.width, size.height, longEdge);
  }
  const { arrayBuffer, contentType } = await encodeJpeg(uri, actions, compress);
  return { arrayBuffer, contentType };
}

/**
 * 投稿画像を表示用（長辺 1440）とサムネイル（長辺 480）の 2 サイズに変換する。
 * サムネイルは縮小済みの表示用画像から生成するため、原画像を 2 回デコードしない。
 */
export async function imageUriToPostJpegVariants(uri, { width = 0, height = 0 } = {}) {
  if (!uri) throw new Error('画像 URIがありません。');
  const size = await ensureSize(uri, width, height);
  const main = await encodeJpeg(uri, resizeActions(size.width, size.height, POST_MAIN_LONG_EDGE), QUALITY_MAIN);
  const thumb = await encodeJpeg(
    main.uri,
    resizeActions(main.width, main.height, POST_THUMB_LONG_EDGE),
    QUALITY_THUMB
  );
  return { main, thumb };
}
