# 画像配信

投稿画像とアバターの生成・保存・配信の仕組みと、運用手順をまとめる。

## 保存されるオブジェクト

| 用途 | オブジェクトキー | 長辺 | JPEG 品質 |
| --- | --- | --- | --- |
| 投稿画像（表示用） | `{userId}/{postId}/{timestamp}.jpg` | 1440px | 82 |
| 投稿画像（サムネイル） | `{userId}/{postId}/{timestamp}_thumb.jpg` | 480px | 72 |
| アバター | `{userId}/avatar.jpg` | 320px | 80 |

サムネイルはファイル名から導出できるため、DB のカラム追加もマイグレーションも不要。
`posts.image_url` には従来どおり表示用のキーだけを保存する。

いずれも `cacheControl: 31536000`（1 年）でアップロードする。投稿画像のキーには
timestamp が入るため実質 immutable。アバターは固定パスへの upsert だが、URL に
`?v={profiles.updated_at}` が付くのでキャッシュバストできる。

## どちらのサイズが使われるか

`client-app/utils/imageHelper.js` の `getPostImageThumbnailUrl(path, { width })` が
要求幅で振り分ける。閾値は 640px。

- サムネイル: グリッド(240) / タイル(≈228) / ブックリスト(360) / ライフタイムライン(144) / カレンダー(96) / プロフィールグリッド(240)
- 表示用: 一覧のリスト表示（画面幅×2）/ スレッドのフィード（画面幅×2）/ 投稿詳細

サムネイルが存在しない古い投稿は、`components/AppImage.js` の `fallbackUri` により
表示用へ自動フォールバックする。そのためバックフィルの完了を待たずにリリースできる。

## 配信元の切り替え

`EXPO_PUBLIC_IMAGE_CDN_URL` を設定すると、公開オブジェクトの URL のホストがそこに変わる。
パス構造は Supabase Storage と同一（`/storage/v1/object/public/<bucket>/<key>`）。
未設定なら `EXPO_PUBLIC_SUPABASE_URL` に直接アクセスする従来動作になる。

| 環境 | CDN URL | Workers Route |
| --- | --- | --- |
| development | `https://cdn-dev.daibapp.com` | `cdn-dev.daibapp.com/*` → `daib-image-proxy` |
| production | `https://cdn.daibapp.com` | `cdn.daibapp.com/*` → `daib-image-proxy` |

設定箇所は `client-app/.env` と `client-app/eas.json`。Cloudflare 側の詳細は
`cloudflare/image-cdn-worker/README.md` を参照。

## 運用手順

### 1. Cloudflare Worker のデプロイ

Routes はダッシュボードで設定済み。スクリプト更新時のみ:

```sh
cd cloudflare/image-cdn-worker
npx wrangler deploy
```

### 2. 配信の検証

エッジキャッシュと 1 年キャッシュが効いているかを確認する。

```sh
IMAGE_BASE=https://cdn.daibapp.com \
  scripts/verify-image-cdn.sh daib-prod-post-images "<userId>/<postId>/<timestamp>.jpg"
```

2 回目のリクエストで `cf-cache-status=HIT` かつ
`cache-control: public, max-age=31536000, immutable` になっていれば成功。
`cf-cache-status=none` の場合は CDN を経由していない。

### 3. 既存画像のバックフィル

リサイズ導入前の投稿画像は原寸（数 MB）のまま残っている。縮小とサムネイル生成を行う。

**原画像を上書きするため、必ずドライランで確認してから本実行する。**

```sh
export SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service_role キー>
export POST_IMAGES_BUCKET=daib-prod-post-images
export AVATARS_BUCKET=avatars

# 対象件数と縮小後サイズを確認（書き込みなし）
npm run backfill:images:dry-run

# 数件だけ本実行して結果を目視確認
node scripts/backfill-images.mjs --apply --limit 5

# 全件実行
npm run backfill:images

# 中断した場合は最後に処理したキーから再開
node scripts/backfill-images.mjs --apply --resume-from "<最後のobjectKey>"
```

主なオプション:

- `--only posts|avatars|all` 対象の絞り込み
- `--limit N` 処理件数の上限
- `--resume-from <objectKey>` そのキーより後だけ処理する
- `--concurrency N` 同時実行数（既定 3）

変換ロジックだけを検証したい場合は `npm run backfill:images:test`。

## タイムラインのページネーション

スレッドは 1 件が全幅画像のため、`get_timeline_posts` に `p_limit` / `p_offset` を持たせて
`TIMELINE_PAGE_SIZE` 件ずつ取得する（`supabase/migrations/20260909000001_paginate_timeline_posts.sql`）。
引数にはデフォルト値があるので、引数なしで呼ぶ旧クライアントもそのまま動作する。
