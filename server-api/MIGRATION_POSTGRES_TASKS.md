# MySQL（mysql2）→ Supabase PostgreSQL 移行タスク

**方針**: アプリデータを Supabase の Postgres に集約する。**クライアントから DB 直叩きはしない**（API 経由のみ）。RLS は必須ではないが、将来クライアント直結する場合は別途設計する。

---

## 1. 洗い出し: `mysql2` / `db` 使用箇所

### 1.1 エントリ（ドライバ）

| ファイル | 内容 |
|----------|------|
| `db.js` | `mysql2/promise` の `createPool`。`DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_DATABASE` |
| `package.json` | 依存 `mysql2` |

### 1.2 ランタイム（本番 API が直接依存）

| ファイル | 概要 |
|----------|------|
| `server.js` | `db.query('SELECT 1 + 1 ...')` ヘルス用 |
| `models/UserModel.js` | `users`, `password_reset_tokens` |
| `models/UserAvatarModel.js` | `user_avatars` |
| `models/CategoryModel.js` | `categories`（動的 SQL・`sort_order`） |
| `models/RecordModel.js` | `records`, `record_categories`。**`INSERT IGNORE` 一括 INSERT**、プレースホルダ `?` 多数 |
| `models/FollowModel.js` | `follows` 系クエリ多数 |
| `models/ReactionModel.js` | `reactions` |
| `services/memoryResurfaceService.js` | **`db.getConnection()` / `beginTransaction` / `commit` / `rollback`**、`FOR UPDATE`、`ER_DUP_ENTRY` ハンドリング |
| `models/RecordModel.js`（部分） | `findFirstResurfaceRecordIdByLoggedDate` 等、オプション `conn` でトランザクション接続とプールを切替 |

### 1.3 スクリプト（DDL / データ移行用・MySQL 方言）

いずれも `require('../db')` + `db.query`。新規 Postgres 環境では **PostgreSQL 用に書き直すか、Supabase SQL Editor で実行する SQL に置換**する。

| ファイル |
|----------|
| `scripts/init_all_tables.js` |
| `scripts/alter_users_supabase_auth.js` |
| `scripts/add_updated_at_to_users.js` |
| `scripts/drop_visibility_search_key_from_users.js` |
| `scripts/drop_records_image_adjustment_columns.js` |
| `scripts/create_record_categories_table.js` |
| `scripts/alter_record_categories_invalidation.js` |
| `scripts/create_follows_table.js` |
| `scripts/alter_follows_invalidation.js` |
| `scripts/alter_categories_invalidation_and_drop_icon_color.js` |
| `scripts/create_categories_table.js` |
| `scripts/create_reactions_table.js` |
| `scripts/create_password_reset_tokens.js` |
| `scripts/add_sort_order_to_categories.js` |
| `scripts/add_default_sort_order_to_users.js` |
| `scripts/add_default_view_mode_to_users.js` |
| `scripts/add_show_in_timeline_to_records.js` |
| `scripts/add_bio_column_to_users.js` |
| `scripts/add_category_to_records.js` |
| `scripts/create_user_avatars_table.js` |
| `scripts/add_image_url_column.js` |

### 1.4 その他（リポジトリ内）

| ファイル | 備考 |
|----------|------|
| `scripts/add_user_memory_resurface.sql` | 生 SQL（MySQL）。Postgres 用 DDL が別途必要 |
| `Redmine_20251207.md` | ドキュメント上の mysql2 記載。移行後に更新 |

**クライアント（`client-app`）**: `mysql2` / `db` の参照なし（問題なし）。

---

## 2. MySQL → Postgres で直す代表的な差分

- [ ] プレースホルダ: `?` → **`$1, $2, ...`**（`pg` の素のクエリの場合）
- [ ] `AUTO_INCREMENT` → **`GENERATED ALWAYS AS IDENTITY`** または `SERIAL`
- [ ] `` `identifier` `` → **`"identifier"`**（必要時のみ。小文字スネークなら多くはクォート不要）
- [ ] `INSERT IGNORE` → **`INSERT ... ON CONFLICT DO NOTHING`**
- [ ] 重複エラー: `e.code === 'ER_DUP_ENTRY'` → **`e.code === '23505'`**（unique_violation）
- [ ] `FOR UPDATE` は Postgres にもあるが、分離レベル・挙動は確認
- [ ] `BOOLEAN` / `TINYINT(1)` のマッピング
- [ ] 日時型: `TIMESTAMP` の解釈（タイムゾーン）を統一

---

## 3. フェーズ別チェックリスト（移行タスク）

### フェーズ A — 準備

- [ ] Supabase プロジェクトで **Database** の接続方式を決める（下記「接続について」参照）
- [ ] `.env` に **`DATABASE_URL`**（または `PGHOST` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` / `PGSSLMODE=require`）を追加し、**本番ではパスワードをコミットしない**
- [ ] 新規スキーマを **単一の Postgres DDL**（または Supabase マイグレーション）として起こす（`init_all_tables.js` の MySQL 版をベースに変換）

### フェーズ B — 接続層

- [ ] `db.js` を **`pg` の `Pool`** に差し替え（`mysql2` 削除）
- [ ] `db.query(text, params)` の互換ラッパを用意するか、呼び出し側を **`pool.query` の戻り値 `{ rows }`** に合わせて修正（mysql2 の `[rows, fields]` と形が異なる）
- [ ] `getConnection()` を使う箇所（`memoryResurfaceService`）を **`pool.connect()`** + `client.query` + `BEGIN` / `COMMIT` / `ROLLBACK` に置換

### フェーズ C — モデル・サービス（API 動作に必須）

- [ ] `UserModel.js`
- [ ] `UserAvatarModel.js`
- [ ] `CategoryModel.js`
- [ ] `RecordModel.js`（**一括 INSERT / IGNORE** を Postgres 向けに再実装）
- [ ] `FollowModel.js`
- [ ] `ReactionModel.js`
- [ ] `memoryResurfaceService.js`（トランザクション・競合コード **`23505`**）
- [ ] `RecordModel.js` の `conn` 引数パターンを **Postgres の `PoolClient`** に合わせる

### フェーズ D — サーバー起動・認証連携

- [ ] `server.js` の DB 疎通クエリを Postgres 用に変更（例: `SELECT 1 AS solution`）
- [ ] 既存の **Supabase JWT 検証**（`middleware/auth.js`）はそのまま利用可能。DB 内 `users.id` が **integer のままか uuid に寄せるか**はスキーマ設計で決定（移行コストが変わる）

### フェーズ E — データ移行（既存 MySQL から載せ替える場合）

- [ ] テーブルごとにエクスポート / `COPY` / 一時スクリプトで Postgres へ投入
- [ ] シーケンス（`users_id_seq` 等）をデータ投入後に **`setval` で整合**

### フェーズ F — 掃除

- [ ] `package.json` から **`mysql2` を削除**、`pg` を追加
- [ ] MySQL 専用 `scripts/*.js` を **`archive/` に移動**するか README に「廃止」と明記
- [ ] `.env.example` を **Postgres 接続**説明に更新（`DB_HOST` 系は廃止または併記期間のみ）

### フェーズ G — 検証

- [ ] 主要 API（認証・記録・カテゴリ・フォロー・スレッド・リアクション）の手動または自動テスト
- [ ] `memoryResurfaceService` の同時実行（重複 INSERT）で期待どおり **`23505`** 分岐になるか確認

---

## 4. 接続について（Supabase Postgres・クライアント直叩きなし）

### 4.1 誰が DB に繋ぐか

- **Expo アプリ**はこれまで通り **自前 API（`server-api`）** だけを呼ぶ。
- **DB に TCP 接続するのは `server-api` のみ**（長寿命の Node プロセス）。この前提なら **PostgREST / RLS を必須にしない**構成でよい。

### 4.2 接続文字列の場所

Supabase ダッシュボード: **Project Settings → Database**。

- **URI** 形式（例: `postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres`）を `.env` の **`DATABASE_URL`** に置く方法が扱いやすい。
- **Transaction pooler（ポート 6543）**: 接続数を節約しやすい。**prepared statement に制限**があるため、アプリでプリペアドを多用する場合はドライバ設定を確認。
- **Session mode（プーラー）** または **直接 DB（5432）**: セッション特性やマイグレーション CLI によってはこちらが向く場合あり。

### 4.3 SSL

Supabase のホスト向けには通常 **`ssl: { rejectUnauthorized: true }`**（または接続 URI の `sslmode=require`）が必要。`pg` の `Pool` オプションで指定する。

### 4.4 秘密情報

- **`service_role`** や **DB パスワード**は **サーバーの環境変数のみ**。クライアントの `.env` には入れない。
- クライアント側は引き続き **`EXPO_PUBLIC_SUPABASE_*` は anon/publishable のみ**（認証用）。

### 4.5 まとめ

移行完了後のイメージは次のとおり。

1. ユーザー → **Expo** → **自前 API**（Bearer = Supabase `access_token`）  
2. **API** → **`pg` Pool** → **Supabase の PostgreSQL**  
3. **RLS**: 直叩きしないなら必須ではないが、将来 Supabase クライアントをサーバーで使う場合はポリシーを設計可能。

---

## 5. 作業の優先順位（短縮版）

1. Postgres DDL 確定 + `db.js` を `pg` にする  
2. モデル 6 + `memoryResurfaceService` を通す  
3. `server.js` 疎通 → E2E  smoke  
4. 旧 MySQL スクリプトの整理と `mysql2` 削除  

このファイルはチェックリストとして更新しながら進めてください。
