# image-cdn-worker（daib-image-proxy）

公開画像（投稿画像・アバター）を Cloudflare のエッジでキャッシュして配信する Worker。

## なぜ必要か

Supabase Free プランには Smart CDN が無く、アップロード時に指定する `cacheControl` は
ブラウザキャッシュにしか効かない（エッジキャッシュは制御できない）。そのため画像リクエストは
毎回オリジンまで届き、Free プランの egress 上限（uncached 5GB + cached 5GB = 月 10GB）を
すぐに使い切ってしまう。上限に達すると画像が一切表示されなくなる。

この Worker を独自ドメインに載せて前段に置くと、

- エッジで 30 日キャッシュするため、オリジンへの往復は各オブジェクトの初回のみになる
- 端末には `Cache-Control: public, max-age=31536000, immutable` を返す
- Supabase のプランを上げずに CDN 配信になる

## パス構造

Supabase Storage と同じ形を維持しているため、アプリ側はベース URL を差し替えるだけでよい。

```
https://cdn.daibapp.com/storage/v1/object/public/<bucket>/<key>
https://cdn-dev.daibapp.com/storage/v1/object/public/<bucket>/<key>
```

`/storage/v1/object/public/` 以外のパスは 404 を返す（認証が必要なエンドポイントは通さない）。

アバターは `{userId}/avatar.jpg` の固定パスに upsert するため、URL に `?v={profiles.updated_at}`
が付く。Worker はクエリを保持してオリジンに渡すので、プロフィール更新後は別のキャッシュ
エントリとして扱われる。

## Cloudflare 側の設定（完了済み）

Workers Routes（ダッシュボード）:

| Route | Worker |
| --- | --- |
| `cdn.daibapp.com/*` | `daib-image-proxy` → 本番 Supabase |
| `cdn-dev.daibapp.com/*` | `daib-image-proxy` → 開発 Supabase |

同一 Worker が Host ヘッダでオリジンを切り替える（`SUPABASE_ORIGIN_PROD` / `SUPABASE_ORIGIN_DEV`）。

## デプロイ（スクリプト更新時）

Routes はダッシュボード管理のまま。スクリプトと vars だけ更新する。

```sh
cd cloudflare/image-cdn-worker
npx wrangler deploy
```

## 動作確認

```sh
KEY="<userId>/<postId>/<timestamp>.jpg"
IMAGE_BASE=https://cdn.daibapp.com \
  ../../scripts/verify-image-cdn.sh daib-prod-post-images "$KEY"
```

2 回目のリクエストで `cf-cache-status=HIT` かつ
`Cache-Control: public, max-age=31536000, immutable` になっていれば成功。

### 2026-09-09 検証結果

| 項目 | 結果 |
| --- | --- |
| `cdn.daibapp.com` に本スクリプト適用 | OK（`/rest/v1` は 404） |
| ヘルスパス 1 回目 | `cf-cache-status=MISS` + `max-age=31536000, immutable` |
| ヘルスパス 2 回目 | `cf-cache-status=HIT` + `max-age=31536000, immutable` |
| `cdn-dev.daibapp.com` | 旧 dev Supabase ホストが DNS 解決不可。`SUPABASE_ORIGIN_DEV` を有効 URL に差し替える必要あり |

ヘルスパス（オリジン非依存）:

```sh
curl -sS -D - -o /dev/null \
  https://cdn.daibapp.com/storage/v1/object/public/_cdn/health.jpg
```

## アプリ側

| 環境 | `EXPO_PUBLIC_IMAGE_CDN_URL` |
| --- | --- |
| development | `https://cdn-dev.daibapp.com` |
| production | `https://cdn.daibapp.com` |

`client-app/.env` と `client-app/eas.json` に設定済み。未設定なら Supabase へ直接アクセスする。

## 将来 R2 に移行する場合

アプリが参照するのは `EXPO_PUBLIC_IMAGE_CDN_URL` だけなので、同じドメインを R2 バケットの
カスタムドメインに向け直せば、アプリの再ビルドなしで移行できる。その場合は R2 側の
オブジェクトキーを `storage/v1/object/public/<bucket>/<key>` に合わせるか、
Worker 内でキーを読み替える。
