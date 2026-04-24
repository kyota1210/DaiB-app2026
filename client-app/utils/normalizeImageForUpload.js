import * as ImageManipulator from 'expo-image-manipulator';

/** Re-encode picker output (HEIC/PNG/etc.) to JPEG for Storage; fixes wrong Content-Type / HEIC in browsers. */
export async function imageUriToJpegArrayBuffer(uri, compress = 0.92) {
  if (!uri) throw new Error('画像 URIがありません。');
  const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();
  return { arrayBuffer, contentType: 'image/jpeg' };
}
