# Supabase 環境分離・運用ガイド

本書は、DaiB の Supabase プロジェクトを **prod / staging / dev** で分離し、`supabase/migrations/` をすべての環境に同期する手順を定める。

最終更新日: 2026-04-26

---

## 1. 推奨環境構成

| 環境 | 用途 | プラン | 備考 |
|---|---|---|---|
| **prod** | App Store 配信ビルドの接続先 | **Pro** | PITR（Point-In-Time Recovery）必須、Daily backup 有効 |
| **staging** | TestFlight / 内部検証ビルドの接続先 | Free または Pro | prod と同等のスキーマ、本番に近いデータでリハーサル |
| **dev** | 開発者個人 + ローカル `supabase start` | Free | スキーマは migrations と同期、データは自由 |

各環境は **個別の Supabase プロジェクト** とする（同一プロジェクト内のスキーマ分離ではなく、URL とキーを完全に分ける）。

---

## 2. 初期セットアップ手順

### 2.1 Supabase CLI のインストール

```bash
# npm 経由（推奨。プロジェクトルートで dev 依存として）
npm install -D supabase

# または scoop / brew 等
scoop install supabase
brew install supabase/tap/supabase
```

### 2.2 プロジェクトのリンク

各環境（prod / staging / dev）について、Supabase Dashboard から **Project Reference ID** を控え、以下を実行：

```bash
# prod
supabase link --project-ref <prod-project-ref> --password '<db-password-prod>'

# staging
supabase link --project-ref <staging-project-ref> --password '<db-password-staging>'
```

`.supabase/` ディレクトリに状態が保存される（`.gitignore` 済み想定）。複数環境を切り替える場合は、それぞれ別のローカルチェックアウトに分けるか、`SUPABASE_PROJECT_REF` 環境変数を切り替える。

### 2.3 リポジトリの `supabase/migrations/` 適用

```bash
# 既存のスキーマをまっさらな状態から構築する場合
supabase db reset --linked

# 既に運用中のスキーマに対し、新規 migration のみ適用
supabase db push
```

**本番への適用は必ず staging で先に確認したうえで、手動承認のうえ実行すること**（CI 化は F3-1）。

### 2.4 Auth 設定（環境ごとに必要）

各 Supabase プロジェクトの **Authentication → URL Configuration** で以下を設定：

| 項目 | 値 |
|---|---|
| Site URL | `daibapp://` |
| Additional Redirect URLs | `daibapp://`、`daibapp://auth/callback`、`daibapp://invite/`、`https://invite.<本番ドメイン>/auth/callback`（F0-3 で確定） |

**Authentication → Providers → Email** で以下を設定：

| 項目 | 値 | 備考 |
|---|---|---|
| Enable Email provider | ON | |
| Confirm email | **ON**（必須） | 新規登録時にメール確認を要求（F0-6 関連） |
| Secure email change | ON | |
| Secure password change | ON 推奨 | 既存セッションでのパスワード変更前に再認証を要求 |

---

## 3. Storage バケット

各環境で同じバケットを作成する（[supabase/migrations/20260434_ensure_avatars_bucket.sql](../supabase/migrations/20260434_ensure_avatars_bucket.sql) 等）：

- `avatars` （Public read、ユーザー自身のみ書き込み）
- `posts` （Public read、ユーザー自身のみ書き込み）

ストレージポリシーは [supabase/migrations/20260407_storage_policies.sql](../supabase/migrations/20260407_storage_policies.sql) と [20260436_avatars_storage_rls_path_prefix.sql](../supabase/migrations/20260436_avatars_storage_rls_path_prefix.sql) を参照。

---

## 4. Secrets の管理

### 4.1 Edge Functions の環境変数

各 Edge Function で必要な Secret を環境ごとに設定：

```bash
# 例: IAP レシート検証用（prod 環境にリンク済みのとき）
supabase secrets set \
  APPLE_ISSUER_ID=<App Store Connect Issuer ID> \
  APPLE_KEY_ID=<App Store Connect Key ID> \
  APPLE_PRIVATE_KEY=<p8 ファイル内容> \
  APPLE_BUNDLE_ID=com.kytm1210.daibapp2026 \
  APPLE_USE_SANDBOX=false  # staging では true

# Apple Webhook 用
supabase secrets set \
  APPLE_WEBHOOK_SHARED_SECRET=<App Store Connect で発行した Shared Secret>

# お問い合わせ転送用（任意）
supabase secrets set \
  CONTACT_NOTIFY_WEBHOOK=https://<運用通知 Webhook 等>
```

### 4.2 Service Role Key

`SUPABASE_SERVICE_ROLE_KEY` は Edge Functions に自動で渡されるため、Function 内では `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` で参照可能。**クライアントアプリには絶対に同梱しない**。

---

## 5. バックアップ / リストア

### 5.1 Pro プラン以上の自動バックアップ

- Daily backup（過去 7 日）: Pro プランの基本機能
- **PITR**（過去 7 日の任意時点に戻せる）: 追加課金で有効化
- Dashboard → Database → Backups から復旧可能

### 5.2 手動エクスポート（任意・補助）

CI で週次に S3 等へ pg_dump を吐くなど、**冗長なバックアップ運用**は本番運用 1 ヶ月後に検討（F3-2）。

---

## 6. マイグレーション運用ルール

1. ローカルで `supabase migration new <name>` を使い、ファイル名のタイムスタンプ規則に従う
2. PR レビューで SQL を確認（特に RLS 変更）
3. **staging に先行適用** → 自動テスト or 手動検証
4. **prod 適用は手動承認**（GitHub Actions の `environment: production` で承認 step を挟む。F3-1 で構築）
5. ロールバックが必要な場合は逆 SQL を新規 migration として追加（既存ファイルは編集しない）

---

## 7. 環境別接続情報の管理

クライアント側（Expo）は **EAS Secrets** で環境別に注入する（[eas.json](../eas.json) と F1-1 を参照）：

| EAS プロファイル | EXPO_PUBLIC_SUPABASE_URL | EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY |
|---|---|---|
| development | dev プロジェクト | dev anon key |
| preview | staging プロジェクト | staging anon key |
| production | prod プロジェクト | prod anon key |

**Service Role Key** は EAS Secrets には登録しない。Edge Function 内でのみ使う。

