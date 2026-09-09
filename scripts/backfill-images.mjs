#!/usr/bin/env node
/**
 * 既存画像のバックフィル。
 *
 * アップロード時のリサイズを入れる前の投稿画像は、iPhone の 12MP 写真がそのまま
 * （数 MB）保存されている。このスクリプトは Storage の既存オブジェクトを走査して
 *
 *   - 投稿画像: 長辺 1440px に縮小して上書き + 長辺 480px の `_thumb` を新規作成
 *   - アバター: 長辺 320px に縮小して上書き
 *
 * を行い、あわせて `cacheControl` を 1 年に付け替える。
 *
 * 原画像を上書きするため、必ず --dry-run で対象件数と縮小後サイズを確認してから
 * 本実行すること。
 *
 * 使い方:
 *   node scripts/backfill-images.mjs --dry-run
 *   node scripts/backfill-images.mjs --dry-run --limit 20
 *   node scripts/backfill-images.mjs --apply
 *   node scripts/backfill-images.mjs --apply --only posts --resume-from <objectKey>
 *
 * 必要な環境変数（.env でも可）:
 *   SUPABASE_URL              例 https://giknxvsaovkahsonqyqd.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY service_role キー（絶対にクライアントへ渡さない）
 *   POST_IMAGES_BUCKET        例 daib-prod-post-images
 *   AVATARS_BUCKET            既定 avatars
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const POST_MAIN_LONG_EDGE = 1440;
const POST_THUMB_LONG_EDGE = 480;
const AVATAR_LONG_EDGE = 320;
const QUALITY_MAIN = 82;
const QUALITY_THUMB = 72;
const QUALITY_AVATAR = 80;
const CACHE_CONTROL = '31536000';
const THUMB_SUFFIX = '_thumb';
const DB_PAGE_SIZE = 500;

const parseArgs = (argv) => {
    const opts = { apply: false, limit: Infinity, only: 'all', resumeFrom: null, concurrency: 3 };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--apply') opts.apply = true;
        else if (arg === '--dry-run') opts.apply = false;
        else if (arg === '--limit') opts.limit = Number(argv[++i]);
        else if (arg === '--only') opts.only = argv[++i];
        else if (arg === '--resume-from') opts.resumeFrom = argv[++i];
        else if (arg === '--concurrency') opts.concurrency = Number(argv[++i]);
        else {
            console.error(`不明な引数: ${arg}`);
            process.exit(2);
        }
    }
    if (!['all', 'posts', 'avatars'].includes(opts.only)) {
        console.error("--only は all | posts | avatars のいずれか");
        process.exit(2);
    }
    return opts;
};

const requireEnv = (name, fallback) => {
    const value = (process.env[name] || fallback || '').trim();
    if (!value) {
        console.error(`環境変数 ${name} が未設定です。`);
        process.exit(2);
    }
    return value;
};

const formatBytes = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

export const toThumbKey = (objectKey) => objectKey.replace(/(\.[a-z0-9]+)$/i, `${THUMB_SUFFIX}$1`);

/** 長辺を longEdge 以下に収めた JPEG を返す（元が小さければ拡大しない） */
export const resizeJpeg = (buffer, longEdge, quality) =>
    sharp(buffer)
        .rotate() // EXIF の向きを画素に焼き込む（回転情報を落としても見た目が変わらないように）
        .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

/** DB の image_url をバケット内オブジェクトキーに正規化する（client-app/utils/imageHelper.js と同じ規則） */
export const normalizeObjectKey = (raw, bucket) => {
    let s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) return '';
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = s.indexOf(marker);
    if (idx !== -1) s = s.slice(idx + marker.length);
    s = s.replace(/^\/+/, '');
    if (s.startsWith(`${bucket}/`)) s = s.slice(bucket.length + 1);
    s = s.split('?')[0].split('#')[0];
    if (s.includes('..')) return '';
    return decodeURIComponent(s);
};

/** テーブルを DB_PAGE_SIZE ずつ全件読む */
async function* iterateRows(supabase, table, columns, orderColumn) {
    let offset = 0;
    for (;;) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .order(orderColumn, { ascending: true })
            .range(offset, offset + DB_PAGE_SIZE - 1);
        if (error) throw new Error(`${table} の取得に失敗: ${error.message}`);
        const rows = data || [];
        for (const row of rows) yield row;
        if (rows.length < DB_PAGE_SIZE) return;
        offset += rows.length;
    }
}

/** 同時実行数を絞って tasks を回す */
async function runPooled(items, concurrency, worker) {
    let cursor = 0;
    const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
        for (;;) {
            const index = cursor++;
            if (index >= items.length) return;
            await worker(items[index], index);
        }
    });
    await Promise.all(runners);
}

const stats = {
    postsScanned: 0,
    postsResized: 0,
    postsThumbCreated: 0,
    postsSkipped: 0,
    avatarsScanned: 0,
    avatarsResized: 0,
    avatarsSkipped: 0,
    bytesBefore: 0,
    bytesAfter: 0,
    errors: [],
};

const download = async (supabase, bucket, key) => {
    const { data, error } = await supabase.storage.from(bucket).download(key);
    if (error) throw new Error(`download 失敗 ${bucket}/${key}: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
};

const upload = async (supabase, bucket, key, buffer) => {
    const { error } = await supabase.storage.from(bucket).upload(key, buffer, {
        contentType: 'image/jpeg',
        cacheControl: CACHE_CONTROL,
        upsert: true,
    });
    if (error) throw new Error(`upload 失敗 ${bucket}/${key}: ${error.message}`);
};

const objectExists = async (supabase, bucket, key) => {
    const slash = key.lastIndexOf('/');
    const dir = slash === -1 ? '' : key.slice(0, slash);
    const name = slash === -1 ? key : key.slice(slash + 1);
    const { data, error } = await supabase.storage.from(bucket).list(dir, { limit: 100, search: name });
    if (error) return false;
    return (data || []).some((entry) => entry.name === name);
};

async function backfillPosts(supabase, bucket, opts) {
    const keys = [];
    for await (const row of iterateRows(supabase, 'posts', 'id,image_url', 'id')) {
        const key = normalizeObjectKey(row.image_url, bucket);
        if (!key) continue;
        if (key.includes(`${THUMB_SUFFIX}.`)) continue; // 派生を原画像として扱わない
        if (opts.resumeFrom && key <= opts.resumeFrom) continue;
        keys.push(key);
        if (keys.length >= opts.limit) break;
    }
    // 重複（同じ画像を指す複数行）を除去
    const uniqueKeys = [...new Set(keys)];
    console.log(`[posts] 対象 ${uniqueKeys.length} 件（bucket: ${bucket}）`);

    await runPooled(uniqueKeys, opts.concurrency, async (key, index) => {
        stats.postsScanned += 1;
        try {
            const original = await download(supabase, bucket, key);
            const meta = await sharp(original).metadata();
            const longEdge = Math.max(meta.width || 0, meta.height || 0);
            const main = await resizeJpeg(original, POST_MAIN_LONG_EDGE, QUALITY_MAIN);
            const thumb = await resizeJpeg(main, POST_THUMB_LONG_EDGE, QUALITY_THUMB);
            const thumbKey = toThumbKey(key);
            const thumbAlreadyThere = await objectExists(supabase, bucket, thumbKey);

            // 縮小しても小さくならず、サムネイルも既にあるなら触らない
            const mainWorthReplacing = main.length < original.length * 0.95;
            if (!mainWorthReplacing && thumbAlreadyThere) {
                stats.postsSkipped += 1;
                return;
            }

            stats.bytesBefore += original.length;
            stats.bytesAfter += (mainWorthReplacing ? main.length : original.length) + thumb.length;

            const label = `[${index + 1}/${uniqueKeys.length}] ${key}`;
            if (!opts.apply) {
                console.log(
                    `${label}\n  main  ${longEdge}px ${formatBytes(original.length)} -> ${POST_MAIN_LONG_EDGE}px ${formatBytes(main.length)}${mainWorthReplacing ? '' : ' (据え置き)'}` +
                    `\n  thumb ${formatBytes(thumb.length)}${thumbAlreadyThere ? ' (既存を上書き)' : ' (新規)'}`
                );
                if (mainWorthReplacing) stats.postsResized += 1;
                if (!thumbAlreadyThere) stats.postsThumbCreated += 1;
                return;
            }

            // 先にサムネイルを作る。main の上書きが失敗しても表示は成立させる。
            await upload(supabase, bucket, thumbKey, thumb);
            if (!thumbAlreadyThere) stats.postsThumbCreated += 1;
            if (mainWorthReplacing) {
                await upload(supabase, bucket, key, main);
                stats.postsResized += 1;
            }
            console.log(`${label} 完了 ${formatBytes(original.length)} -> ${formatBytes(main.length)} + ${formatBytes(thumb.length)}`);
        } catch (e) {
            stats.errors.push(`posts ${key}: ${e.message}`);
            console.error(`  ! ${key}: ${e.message}`);
        }
    });
}

async function backfillAvatars(supabase, bucket, opts) {
    const keys = [];
    for await (const row of iterateRows(supabase, 'profiles', 'id,avatar_url', 'id')) {
        const key = normalizeObjectKey(row.avatar_url, bucket);
        if (!key) continue;
        if (opts.resumeFrom && key <= opts.resumeFrom) continue;
        keys.push(key);
        if (keys.length >= opts.limit) break;
    }
    const uniqueKeys = [...new Set(keys)];
    console.log(`[avatars] 対象 ${uniqueKeys.length} 件（bucket: ${bucket}）`);

    await runPooled(uniqueKeys, opts.concurrency, async (key, index) => {
        stats.avatarsScanned += 1;
        try {
            const original = await download(supabase, bucket, key);
            const resized = await resizeJpeg(original, AVATAR_LONG_EDGE, QUALITY_AVATAR);
            if (resized.length >= original.length * 0.95) {
                stats.avatarsSkipped += 1;
                return;
            }
            stats.bytesBefore += original.length;
            stats.bytesAfter += resized.length;
            const label = `[${index + 1}/${uniqueKeys.length}] ${key}`;
            if (!opts.apply) {
                console.log(`${label} ${formatBytes(original.length)} -> ${AVATAR_LONG_EDGE}px ${formatBytes(resized.length)}`);
                stats.avatarsResized += 1;
                return;
            }
            await upload(supabase, bucket, key, resized);
            stats.avatarsResized += 1;
            console.log(`${label} 完了 ${formatBytes(original.length)} -> ${formatBytes(resized.length)}`);
        } catch (e) {
            stats.errors.push(`avatars ${key}: ${e.message}`);
            console.error(`  ! ${key}: ${e.message}`);
        }
    });
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    const supabaseUrl = requireEnv('SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const postsBucket = requireEnv('POST_IMAGES_BUCKET', process.env.EXPO_PUBLIC_POST_IMAGES_BUCKET);
    const avatarsBucket = requireEnv('AVATARS_BUCKET', process.env.EXPO_PUBLIC_AVATARS_BUCKET || 'avatars');

    console.log(`モード: ${opts.apply ? '本実行（上書きします）' : 'ドライラン（書き込みなし）'}`);
    console.log(`対象: ${opts.only} / プロジェクト: ${supabaseUrl}`);
    if (Number.isFinite(opts.limit)) console.log(`件数上限: ${opts.limit}`);
    if (opts.resumeFrom) console.log(`再開位置: ${opts.resumeFrom} より後`);
    console.log('');

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    if (opts.only === 'all' || opts.only === 'posts') {
        await backfillPosts(supabase, postsBucket, opts);
    }
    if (opts.only === 'all' || opts.only === 'avatars') {
        await backfillAvatars(supabase, avatarsBucket, opts);
    }

    console.log('\n=== 集計 ===');
    console.log(`投稿画像: 走査 ${stats.postsScanned} / 縮小 ${stats.postsResized} / サムネイル新規 ${stats.postsThumbCreated} / スキップ ${stats.postsSkipped}`);
    console.log(`アバター: 走査 ${stats.avatarsScanned} / 縮小 ${stats.avatarsResized} / スキップ ${stats.avatarsSkipped}`);
    console.log(`転送サイズ: ${formatBytes(stats.bytesBefore)} -> ${formatBytes(stats.bytesAfter)}`);
    if (stats.errors.length > 0) {
        console.log(`\nエラー ${stats.errors.length} 件:`);
        for (const message of stats.errors) console.log(`  - ${message}`);
        process.exitCode = 1;
    }
    if (!opts.apply) {
        console.log('\nドライランのため書き込みは行っていません。内容を確認したら --apply を付けて再実行してください。');
    }
}

// テストから import したときに CLI 本体が走らないようにする
const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
