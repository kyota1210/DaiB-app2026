/**
 * 公開画像のキャッシュプロキシ。
 *
 * Supabase Free プランには Smart CDN が無く、`cacheControl` はブラウザキャッシュにしか効かない。
 * そのため画像リクエストは毎回オリジンまで届き、月 10GB（uncached 5GB + cached 5GB）の
 * egress を消費してしまう。この Worker を独自ドメインに載せて前段に置くことで、
 * Cloudflare のエッジで長期キャッシュし、オリジンへの往復を初回のみに抑える。
 *
 * パス構造は Supabase Storage と同じままにしてある:
 *   https://cdn.daibapp.com/storage/v1/object/public/<bucket>/<key>
 * クライアント側は EXPO_PUBLIC_IMAGE_CDN_URL を差し替えるだけでよい。
 *
 * Cloudflare ダッシュボードでは同一 Worker（daib-image-proxy）に
 *   - cdn.daibapp.com/*      → 本番 Supabase
 *   - cdn-dev.daibapp.com/*  → 開発 Supabase
 * を割り当てているため、Host ヘッダでオリジンを切り替える。
 */

/** 公開オブジェクトのみ通す。認証が必要なパスは絶対にプロキシしない。 */
const PUBLIC_OBJECT_PREFIX = '/storage/v1/object/public/';

/**
 * オリジンを叩かずにエッジキャッシュを検証するためのパス。
 * 実画像のキーが手元にないときでも HIT / Cache-Control を確認できる。
 */
const HEALTH_PATH = '/storage/v1/object/public/_cdn/health.jpg';

/** エッジ保持期間（30 日）。オブジェクトキーに timestamp が入るため実質 immutable。 */
const EDGE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

/** 端末側の保持期間（1 年）。 */
const BROWSER_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Host → オリジン選択。ダッシュボードの Workers Routes と対応させる。 */
const HOST_ORIGIN_ENV = {
    'cdn.daibapp.com': 'SUPABASE_ORIGIN_PROD',
    'cdn-dev.daibapp.com': 'SUPABASE_ORIGIN_DEV',
};

/** 1x1 JPEG（検証用。実ユーザーデータではない） */
const HEALTH_JPEG = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00,
    0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
    0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
    0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55,
    0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94,
    0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2,
    0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
    0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7b, 0xdf, 0xff, 0xd9,
]);

const methodNotAllowed = () =>
    new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });

const resolveOrigin = (request, env) => {
    const host = new URL(request.url).hostname.toLowerCase();
    const envKey = HOST_ORIGIN_ENV[host];
    if (envKey && env[envKey]) {
        return String(env[envKey]).replace(/\/+$/, '');
    }
    // 単一オリジン運用・ローカル検証用のフォールバック（prod を既定にする）
    if (env.SUPABASE_ORIGIN_PROD) {
        return String(env.SUPABASE_ORIGIN_PROD).replace(/\/+$/, '');
    }
    if (env.SUPABASE_ORIGIN) {
        return String(env.SUPABASE_ORIGIN).replace(/\/+$/, '');
    }
    return '';
};

const healthResponse = () =>
    new Response(HEALTH_JPEG, {
        status: 200,
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': BROWSER_CACHE_CONTROL,
            'Access-Control-Allow-Origin': '*',
            'X-Content-Type-Options': 'nosniff',
        },
    });

export default {
    async fetch(request, env, ctx) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return methodNotAllowed();
        }

        const url = new URL(request.url);
        if (!url.pathname.startsWith(PUBLIC_OBJECT_PREFIX)) {
            return new Response('Not Found', { status: 404 });
        }

        // ヘルスチェック: Cache API 経由でエッジ HIT を再現できるようにする
        if (url.pathname === HEALTH_PATH) {
            const cache = caches.default;
            const cacheKey = new Request(url.toString(), request);
            const cached = await cache.match(cacheKey);
            if (cached) {
                const hit = new Response(cached.body, cached);
                hit.headers.set('CF-Cache-Status', 'HIT');
                // Cache API 経由だと no-store が付くことがあるので、端末向けヘッダを明示し直す
                hit.headers.set('Cache-Control', BROWSER_CACHE_CONTROL);
                return hit;
            }
            const fresh = healthResponse();
            // waitUntil で非同期にキャッシュへ載せる
            const toStore = fresh.clone();
            ctx.waitUntil(cache.put(cacheKey, toStore));
            const miss = new Response(fresh.body, fresh);
            miss.headers.set('CF-Cache-Status', 'MISS');
            return miss;
        }

        const origin = resolveOrigin(request, env);
        if (!origin) {
            return new Response('SUPABASE_ORIGIN is not configured for this host', { status: 500 });
        }

        // アバターは固定パス upsert なので ?v={updated_at} でキャッシュバストされる。
        // クエリを保持しないと更新後も古い画像を返してしまう。
        const upstreamUrl = `${origin}${url.pathname}${url.search}`;

        let upstream;
        try {
            upstream = await fetch(upstreamUrl, {
                method: request.method,
                headers: pickForwardHeaders(request.headers),
                cf: {
                    cacheEverything: true,
                    cacheTtl: EDGE_CACHE_TTL_SECONDS,
                    cacheTtlByStatus: {
                        '200-299': EDGE_CACHE_TTL_SECONDS,
                        '404': 60,
                        '400-499': 60,
                        '500-599': 0,
                    },
                },
            });
        } catch (err) {
            // オリジン DNS 未解決など（dev プロジェクト停止時）
            return new Response(`Upstream fetch failed: ${err?.message || err}`, {
                status: 502,
                headers: {
                    'Cache-Control': 'public, max-age=60',
                    'Access-Control-Allow-Origin': '*',
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        }

        const response = new Response(upstream.body, upstream);
        if (upstream.ok) {
            response.headers.set('Cache-Control', BROWSER_CACHE_CONTROL);
        } else {
            // 失敗応答を端末に焼き付けない
            response.headers.set('Cache-Control', 'public, max-age=60');
        }
        response.headers.delete('set-cookie');
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        return response;
    },
};

const FORWARD_HEADERS = ['accept', 'accept-encoding', 'range', 'if-none-match', 'if-modified-since'];

const pickForwardHeaders = (headers) => {
    const out = new Headers();
    for (const name of FORWARD_HEADERS) {
        const value = headers.get(name);
        if (value) out.set(name, value);
    }
    return out;
};
