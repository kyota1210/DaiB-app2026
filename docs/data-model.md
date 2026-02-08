# データモデル

## エンティティ一覧

Otiumアプリケーションは以下のエンティティで構成されています：

1. **users** - ユーザー情報
2. **records** - 記録
3. **categories** - カテゴリー
4. **user_avatars** - ユーザーアバター画像

## ER図

```
┌─────────────────────────────────────┐
│           users                     │
├─────────────────────────────────────┤
│ * id (PK)                           │
│   email (UNIQUE)                    │
│   user_name                         │
│   password_hash                     │
│   created_at                        │
│   updated_at                        │
└──────────────┬──────────────────────┘
               │ 1
               │
               │ N
┌──────────────▼──────────────────────┐
│           records                   │
├─────────────────────────────────────┤
│ * id (PK)                           │
│   user_id (FK) → users.id           │
│   title                             │
│   description                       │
│   date_logged                       │
│   image_url                         │
│   category_id (FK) → categories.id  │
│   aspect_ratio                      │
│   zoom_level                        │
│   position_x                        │
│   position_y                        │
│   invalidation_flag                 │
│   created_at                        │
│   updated_at                        │
│   delete_at                         │
└──────────────┬──────────────────────┘
               │
               │ N
               │
┌──────────────▼──────────────────────┐
│           categories                │
├─────────────────────────────────────┤
│ * id (PK)                           │
│   user_id (FK) → users.id           │
│   name                              │
│   icon                              │
│   created_at                        │
│   updated_at                        │
└──────────────┬──────────────────────┘

┌─────────────────────────────────────┐
│        user_avatars                │
├─────────────────────────────────────┤
│ * id (PK)                           │
│   user_id (FK) → users.id           │
│   image_url                         │
│   created_at                        │
│   updated_at                        │
└─────────────────────────────────────┘
```

## エンティティ詳細

### 1. users（ユーザー）

ユーザーアカウント情報を管理するテーブル

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | ユーザーID（主キー） |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス（ログインID） |
| user_name | VARCHAR(255) | NULL | ユーザー表示名 |
| password_hash | VARCHAR(255) | NOT NULL | bcryptでハッシュ化されたパスワード |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

**インデックス**:
- PRIMARY KEY: `id`
- UNIQUE INDEX: `email`

**関連**:
- 1対多: records（1ユーザーは複数の記録を持つ）
- 1対多: categories（1ユーザーは複数のカテゴリーを持つ）
- 1対1: user_avatars（1ユーザーは1つのアバター画像を持つ）

---

### 2. records（記録）

ユーザーの記録データを管理するテーブル

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 記録ID（主キー） |
| user_id | INT | FOREIGN KEY, NOT NULL | ユーザーID（外部キー → users.id） |
| title | VARCHAR(255) | NOT NULL | 記録のタイトル（デフォルト: "無題の記録"） |
| description | TEXT | NULL | 記録の詳細説明 |
| date_logged | DATE | NOT NULL | 記録日付 |
| image_url | VARCHAR(500) | NULL | 画像ファイルのパス（例: "uploads/filename.jpg"） |
| category_id | INT | FOREIGN KEY, NULL | カテゴリーID（外部キー → categories.id） |
| aspect_ratio | VARCHAR(10) | DEFAULT '1:1' | 画像のアスペクト比（例: "1:1", "16:9"） |
| zoom_level | DECIMAL(5,2) | DEFAULT 1.0 | 画像のズームレベル |
| position_x | INT | DEFAULT 0 | 画像のX座標位置 |
| position_y | INT | DEFAULT 0 | 画像のY座標位置 |
| invalidation_flag | TINYINT(1) | DEFAULT 0 | 削除フラグ（0: 有効, 1: 削除済み） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |
| delete_at | TIMESTAMP | NULL | 削除日時（論理削除時） |

**インデックス**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)`
- FOREIGN KEY: `category_id` REFERENCES `categories(id)`
- INDEX: `user_id, invalidation_flag`（検索性能向上のため）

**関連**:
- 多対1: users（複数の記録は1ユーザーに属する）
- 多対1: categories（複数の記録は1カテゴリーに属する、NULL可）

**ビジネスルール**:
- `invalidation_flag=1` の記録は表示されない（論理削除）
- `category_id` が NULL の場合はカテゴリー未設定
- `date_logged` は必須

---

### 3. categories（カテゴリー）

記録を分類するためのカテゴリーを管理するテーブル

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | カテゴリーID（主キー） |
| user_id | INT | FOREIGN KEY, NOT NULL | ユーザーID（外部キー → users.id） |
| name | VARCHAR(255) | NOT NULL | カテゴリー名 |
| icon | VARCHAR(50) | NOT NULL | アイコン名（例: "home", "work"） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

**インデックス**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)`

**関連**:
- 多対1: users（複数のカテゴリーは1ユーザーに属する）
- 1対多: records（1カテゴリーは複数の記録を持つ）

**ビジネスルール**:
- ユーザーごとに独立したカテゴリー
- `name` は必須

---

### 5. user_avatars（ユーザーアバター画像）

ユーザーのアバター画像を管理するテーブル

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | アバターID（主キー） |
| user_id | INT | FOREIGN KEY, NOT NULL, UNIQUE | ユーザーID（外部キー → users.id） |
| image_url | VARCHAR(500) | NOT NULL | 画像ファイルのパス（例: "uploads/avatar-filename.jpg"） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

**インデックス**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)`
- UNIQUE INDEX: `user_id`（1ユーザーに1アバターのみ）

**関連**:
- 1対1: users（1アバターは1ユーザーに属する）

**ビジネスルール**:
- 1ユーザーにつき1アバター画像のみ設定可能
- アバター画像は任意（設定されていない場合もある）

---

## データ型の詳細

### 文字列型

- **VARCHAR(n)**: 可変長文字列（最大n文字）
- **TEXT**: 長文テキスト（最大65,535文字）

### 数値型

- **INT**: 32ビット整数（-2,147,483,648 ～ 2,147,483,647）
- **TINYINT(1)**: 1バイト整数（0 ～ 255、フラグとして使用）
- **DECIMAL(p,s)**: 固定精度の小数（p: 全体の桁数、s: 小数部の桁数）

### 日時型

- **DATE**: 日付（YYYY-MM-DD）
- **TIMESTAMP**: 日時（YYYY-MM-DD HH:MM:SS）

---

## データ整合性ルール

### 外部キー制約

1. **records.user_id** → **users.id**
   - ユーザーが削除された場合の動作: 未定義（現状、ユーザー削除機能なし）

2. **records.category_id** → **categories.id**
   - カテゴリーが削除された場合: `category_id` は NULL になる（物理削除のため）

3. **user_avatars.user_id** → **users.id**
   - ユーザーが削除された場合の動作: 未定義（現状、ユーザー削除機能なし）

### 論理削除

- **records** テーブルは論理削除を採用
  - `invalidation_flag=1` で削除済みを表現
  - `delete_at` に削除日時を記録
  - 物理削除は行わない（データの復元が可能）

- **categories** テーブルは物理削除を採用
  - 削除時はレコードを完全に削除
  - 関連する `records.category_id` は NULL になる

---

## データベース設計の考慮事項

### パフォーマンス

1. **インデックス**
   - `users.email`: ログイン時の検索を高速化
   - `records(user_id, invalidation_flag)`: ユーザーの記録一覧取得を高速化

2. **文字コード**
   - UTF-8（utf8mb4）を使用し、絵文字なども保存可能

### セキュリティ

1. **パスワード**
   - `password_hash` に平文パスワードは保存しない
   - bcryptでハッシュ化（ソルトラウンド10）

2. **データ分離**
   - すべてのクエリで `user_id` によるフィルタリングを実施
   - ユーザー間でデータが混在しないようにする

### 拡張性

1. **画像URL**
   - `image_url` は相対パスで保存（例: "uploads/filename.jpg"）
   - 将来的にCDNやS3に移行しやすい設計

2. **カテゴリー**
   - ユーザーごとに独立したカテゴリー
   - 将来的に共有カテゴリー機能を追加可能

---

## データベース初期化

テーブル作成スクリプトは `server-api/scripts/` ディレクトリにあります：

- `create_categories_table.js` - categories テーブル作成
- `create_user_avatars_table.js` - user_avatars テーブル作成

**注意**: `category_images`テーブルは削除されました。関連するマイグレーションスクリプトは `migrate_drop_category_images_table.js` を参照してください。

データベース設計ファイル（A5:SQL Mk-2形式）は `Doc/DDL/otium.a5er` にあります。
