/**
 * backfill-images.mjs の変換ロジックの検証。
 * 本番データを触る前に、リサイズ結果とキー正規化が期待どおりか確認する。
 *
 *   node scripts/backfill-images.test.mjs
 */
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { resizeJpeg, normalizeObjectKey, toThumbKey } from './backfill-images.mjs';

const BUCKET = 'daib-prod-post-images';

const checks = [];
const check = async (name, fn) => {
    try {
        await fn();
        checks.push(`ok   ${name}`);
    } catch (e) {
        checks.push(`FAIL ${name}\n       ${e.message}`);
        process.exitCode = 1;
    }
};

/** iPhone の 12MP 写真相当（4032x3024）のノイズ画像を作る（一様色だと圧縮が効きすぎて実態と乖離するため） */
const makeSourceJpeg = async (width, height) => {
    const pixels = Buffer.alloc(width * height * 3);
    for (let i = 0; i < pixels.length; i += 1) pixels[i] = (i * 2654435761) % 256;
    return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
};

await check('横長 4032x3024 は長辺 1440 に収まる', async () => {
    const src = await makeSourceJpeg(4032, 3024);
    const out = await resizeJpeg(src, 1440, 82);
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, 1440);
    assert.equal(meta.height, 1080);
    assert.ok(out.length < src.length, `縮小後が大きい: ${src.length} -> ${out.length}`);
});

await check('縦長 3024x4032 でも長辺基準で 1440 に収まる', async () => {
    const src = await makeSourceJpeg(3024, 4032);
    const out = await resizeJpeg(src, 1440, 82);
    const meta = await sharp(out).metadata();
    assert.equal(meta.height, 1440);
    assert.equal(meta.width, 1080);
});

await check('サムネイルは長辺 480', async () => {
    const src = await makeSourceJpeg(4032, 3024);
    const main = await resizeJpeg(src, 1440, 82);
    const thumb = await resizeJpeg(main, 480, 72);
    const meta = await sharp(thumb).metadata();
    assert.equal(meta.width, 480);
    assert.equal(meta.height, 360);
    assert.ok(thumb.length < main.length);
});

await check('元より小さいサイズには拡大しない', async () => {
    const src = await makeSourceJpeg(300, 200);
    const out = await resizeJpeg(src, 1440, 82);
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, 300);
    assert.equal(meta.height, 200);
});

await check('EXIF の回転を画素に焼き込む', async () => {
    // orientation=6（右90度回転）を付けた 400x200。回転適用後は 200x400 になる。
    const src = await sharp({ create: { width: 400, height: 200, channels: 3, background: '#888' } })
        .withMetadata({ orientation: 6 })
        .jpeg()
        .toBuffer();
    const out = await resizeJpeg(src, 1440, 82);
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, 200);
    assert.equal(meta.height, 400);
});

await check('バケット内キーはそのまま通る', () => {
    assert.equal(normalizeObjectKey('u1/42/1700000000000.jpg', BUCKET), 'u1/42/1700000000000.jpg');
});

await check('公開 URL 形式からキーを取り出す', () => {
    assert.equal(
        normalizeObjectKey(`https://x.supabase.co/storage/v1/object/public/${BUCKET}/u1/42/1700000000000.jpg`, BUCKET),
        'u1/42/1700000000000.jpg'
    );
});

await check('CDN ドメインの URL でもホスト非依存でキーを取り出す', () => {
    assert.equal(
        normalizeObjectKey(`https://cdn.example.com/storage/v1/object/public/${BUCKET}/u1/42/1700000000000.jpg`, BUCKET),
        'u1/42/1700000000000.jpg'
    );
});

await check('クエリとバケット接頭辞を落とす', () => {
    assert.equal(normalizeObjectKey(`${BUCKET}/u1/avatar.jpg?v=123`, BUCKET), 'u1/avatar.jpg');
});

await check('パストラバーサルを弾く', () => {
    assert.equal(normalizeObjectKey('../../etc/passwd', BUCKET), '');
});

await check('空・null は空文字', () => {
    assert.equal(normalizeObjectKey(null, BUCKET), '');
    assert.equal(normalizeObjectKey('   ', BUCKET), '');
});

await check('サムネイルキーは拡張子の前に _thumb を挟む', () => {
    assert.equal(toThumbKey('u1/42/1700000000000.jpg'), 'u1/42/1700000000000_thumb.jpg');
    assert.equal(toThumbKey('u1/42/photo.JPEG'), 'u1/42/photo_thumb.JPEG');
});

console.log(checks.join('\n'));
console.log(process.exitCode ? '\n失敗があります。' : '\nすべて通りました。');
