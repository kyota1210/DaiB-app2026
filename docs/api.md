# API仕様

## ベースURL

```
開発環境: http://localhost:3000/api
本番環境: https://your-domain.com/api
```

## 認証方式

### JWT（JSON Web Token）

保護されたエンドポイントでは、リクエストヘッダーにJWTトークンを含める必要があります：

```
Authorization: Bearer <JWT_TOKEN>
```

### トークンの取得

`POST /api/auth/login` エンドポイントでトークンを取得できます。

### トークンの有効期限

- 有効期限: 1日
- 期限切れ後は再ログインが必要

---

## エンドポイント一覧

### 認証API（/api/auth）

#### POST /api/auth/signup
ユーザー登録

**認証**: 不要

**リクエストボディ**:
```json
{
  "email": "user@example.com",
  "user_name": "山田太郎",
  "password": "securePassword123"
}
```

**レスポンス（成功: 201）**:
```json
{
  "message": "ユーザー登録が完了しました。",
  "userId": 1
}
```

**エラーレスポンス**:
- `400`: メールアドレスまたはパスワードが未入力
- `409`: メールアドレスが既に登録済み
- `500`: サーバーエラー

---

#### POST /api/auth/login
ログイン

**認証**: 不要

**リクエストボディ**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**レスポンス（成功: 200）**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "user_name": "山田太郎"
  }
}
```

**エラーレスポンス**:
- `401`: メールアドレスまたはパスワードが正しくない
- `500`: サーバーエラー

---

#### GET /api/auth/me
ログイン中のユーザー情報を取得

**認証**: 必要

**リクエストヘッダー**:
```
Authorization: Bearer <JWT_TOKEN>
```

**レスポンス（成功: 200）**:
```json
{
  "user": {
    "id": 1,
    "user_name": "山田太郎",
    "email": "user@example.com",
    "avatar_url": "uploads/avatar-1234567890.jpg"
  }
}
```

**エラーレスポンス**:
- `401`: 認証トークンが無効
- `404`: ユーザーが見つからない
- `500`: サーバーエラー

---

### 記録API（/api/records）

すべてのエンドポイントで認証が必要です。

#### POST /api/records
記録の作成

**認証**: 必要

**リクエスト**:
- Content-Type: `multipart/form-data`
- ボディ:
  - `title` (string, 任意): 記録のタイトル
  - `description` (string, 任意): 記録の説明
  - `date_logged` (string, 必須): 記録日付（YYYY-MM-DD形式）
  - `category_id` (integer, 任意): カテゴリーID
  - `image` (file, 任意): 画像ファイル
  - `aspect_ratio` (string, 任意): アスペクト比（デフォルト: "1:1"）
  - `zoom_level` (float, 任意): ズームレベル（デフォルト: 1.0）
  - `position_x` (integer, 任意): X座標（デフォルト: 0）
  - `position_y` (integer, 任意): Y座標（デフォルト: 0）

**レスポンス（成功: 201）**:
```json
{
  "message": "記録が作成されました。",
  "recordId": 10,
  "imageUrl": "uploads/1234567890-filename.jpg"
}
```

**エラーレスポンス**:
- `400`: 日付が未入力、または画像アップロードエラー
- `401`: 認証トークンが無効
- `500`: サーバーエラー

---

#### GET /api/records
記録の一覧取得

**認証**: 必要

**クエリパラメータ**:
- `category_id` (integer, 任意): カテゴリーIDでフィルター

**レスポンス（成功: 200）**:
```json
[
  {
    "id": 10,
    "title": "今日の振り返り",
    "description": "良い一日だった",
    "date_logged": "2025-12-07",
    "image_url": "uploads/1234567890-filename.jpg",
    "category_id": 1,
    "category_name": "仕事",
    "category_icon": "briefcase",
    "category_color": "#FF5733",
    "aspect_ratio": "1:1",
    "zoom_level": 1.0,
    "position_x": 0,
    "position_y": 0,
    "created_at": "2025-12-07T10:30:00.000Z"
  },
  {
    "id": 9,
    "title": "昨日の記録",
    "description": "忙しかった",
    "date_logged": "2025-12-06",
    "image_url": "uploads/1234567891-filename.jpg",
    "category_id": null,
    "category_name": null,
    "category_icon": null,
    "category_color": null,
    "aspect_ratio": "16:9",
    "zoom_level": 1.5,
    "position_x": 10,
    "position_y": 20,
    "created_at": "2025-12-06T15:20:00.000Z"
  }
]
```

**注意**: 
- ログイン中のユーザーの記録のみが返されます
- 削除済み（invalidation_flag=1）の記録は含まれません
- 作成日時の降順でソートされます

---

#### GET /api/records/:id
特定の記録を取得

**認証**: 必要

**パスパラメータ**:
- `id` (integer): 記録ID

**レスポンス（成功: 200）**:
```json
{
  "id": 10,
  "title": "今日の振り返り",
  "description": "良い一日だった",
  "date_logged": "2025-12-07",
  "image_url": "uploads/1234567890-filename.jpg",
  "category_id": 1,
  "category_name": "仕事",
  "category_icon": "briefcase",
  "category_color": "#FF5733",
  "aspect_ratio": "1:1",
  "zoom_level": 1.0,
  "position_x": 0,
  "position_y": 0,
  "created_at": "2025-12-07T10:30:00.000Z"
}
```

**エラーレスポンス**:
- `401`: 認証トークンが無効
- `404`: 記録が見つからない、またはアクセス権限がない
- `500`: サーバーエラー

---

#### PUT /api/records/:id
記録の更新

**認証**: 必要

**パスパラメータ**:
- `id` (integer): 記録ID

**リクエスト**:
- Content-Type: `multipart/form-data`
- ボディ:
  - `title` (string, 任意): 記録のタイトル
  - `description` (string, 任意): 記録の説明
  - `date_logged` (string, 必須): 記録日付（YYYY-MM-DD形式）
  - `category_id` (integer, 任意): カテゴリーID（null可）
  - `image` (file, 任意): 新しい画像ファイル（更新する場合）
  - `aspect_ratio` (string, 任意): アスペクト比
  - `zoom_level` (float, 任意): ズームレベル
  - `position_x` (integer, 任意): X座標
  - `position_y` (integer, 任意): Y座標

**レスポンス（成功: 200）**:
```json
{
  "message": "記録が更新されました。",
  "imageUrl": "uploads/1234567890-filename.jpg"
}
```

**エラーレスポンス**:
- `400`: 日付が未入力、または画像アップロードエラー
- `401`: 認証トークンが無効
- `404`: 記録が見つからない、または更新権限がない
- `500`: サーバーエラー

---

#### DELETE /api/records/:id
記録の削除（論理削除）

**認証**: 必要

**パスパラメータ**:
- `id` (integer): 記録ID

**レスポンス（成功: 200）**:
```json
{
  "message": "記録が削除されました。"
}
```

**エラーレスポンス**:
- `401`: 認証トークンが無効
- `404`: 記録が見つからない、または削除権限がない
- `500`: サーバーエラー

**注意**: 物理削除ではなく、`invalidation_flag=1` に設定し、`delete_at` に現在時刻を記録する論理削除です。

---

### カテゴリーAPI（/api/categories）

すべてのエンドポイントで認証が必要です。

#### GET /api/categories
カテゴリーの一覧取得

**認証**: 必要

**レスポンス（成功: 200）**:
```json
{
  "categories": [
    {
      "id": 1,
      "name": "仕事",
      "icon": "briefcase",
      "color": "#FF5733",
      "image_url": "uploads/categories/category-1234567890.jpg",
      "created_at": "2025-12-01T10:00:00.000Z",
      "updated_at": "2025-12-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "プライベート",
      "icon": "home",
      "color": "#33C3F0",
      "image_url": null,
      "created_at": "2025-12-02T10:00:00.000Z",
      "updated_at": "2025-12-02T10:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/categories
カテゴリーの作成

**認証**: 必要

**リクエストボディ**:
```json
{
  "name": "仕事",
  "icon": "briefcase",
  "color": "#FF5733"
}
```

**レスポンス（成功: 201）**:
```json
{
  "message": "カテゴリーを作成しました。",
  "category": {
    "id": 1,
    "name": "仕事",
    "icon": "briefcase",
    "color": "#FF5733",
    "image_url": null,
    "created_at": "2025-12-07T10:00:00.000Z",
    "updated_at": "2025-12-07T10:00:00.000Z"
  }
}
```

**エラーレスポンス**:
- `400`: カテゴリー名、アイコン、カラーが未入力
- `401`: 認証トークンが無効
- `500`: サーバーエラー

---

#### PUT /api/categories/:id
カテゴリーの更新

**認証**: 必要

**パスパラメータ**:
- `id` (integer): カテゴリーID

**リクエストボディ**:
```json
{
  "name": "仕事（更新）",
  "icon": "briefcase",
  "color": "#FF0000"
}
```

**レスポンス（成功: 200）**:
```json
{
  "message": "カテゴリーを更新しました。",
  "category": {
    "id": 1,
    "name": "仕事（更新）",
    "icon": "briefcase",
    "color": "#FF0000",
    "image_url": "uploads/categories/category-1234567890.jpg",
    "created_at": "2025-12-07T10:00:00.000Z",
    "updated_at": "2025-12-07T11:00:00.000Z"
  }
}
```

**エラーレスポンス**:
- `400`: カテゴリー名、アイコン、カラーが未入力
- `401`: 認証トークンが無効
- `404`: カテゴリーが見つからない
- `500`: サーバーエラー

---

#### DELETE /api/categories/:id
カテゴリーの削除

**認証**: 必要

**パスパラメータ**:
- `id` (integer): カテゴリーID

**レスポンス（成功: 200）**:
```json
{
  "message": "カテゴリーを削除しました。"
}
```

**エラーレスポンス**:
- `401`: 認証トークンが無効
- `404`: カテゴリーが見つからない
- `500`: サーバーエラー

**注意**: 物理削除です。関連する記録の `category_id` は NULL になります。

---

#### PUT /api/categories/:id/image
カテゴリー画像のアップロード

**認証**: 必要

**パスパラメータ**:
- `id` (integer): カテゴリーID

**リクエスト**:
- Content-Type: `multipart/form-data`
- ボディ:
  - `image` (file, 必須): 画像ファイル（5MB以下）

**レスポンス（成功: 200）**:
```json
{
  "message": "カテゴリー画像をアップロードしました。",
  "category": {
    "id": 1,
    "name": "仕事",
    "icon": "briefcase",
    "color": "#FF5733",
    "image_url": "uploads/categories/category-1234567890.jpg",
    "created_at": "2025-12-07T10:00:00.000Z",
    "updated_at": "2025-12-07T11:00:00.000Z"
  }
}
```

**エラーレスポンス**:
- `400`: 画像ファイルが必要、または画像サイズが5MBを超える
- `401`: 認証トークンが無効
- `404`: カテゴリーが見つからない
- `500`: サーバーエラー

---

#### DELETE /api/categories/:id/image
カテゴリー画像の削除

**認証**: 必要

**パスパラメータ**:
- `id` (integer): カテゴリーID

**レスポンス（成功: 200）**:
```json
{
  "message": "カテゴリー画像を削除しました。",
  "category": {
    "id": 1,
    "name": "仕事",
    "icon": "briefcase",
    "color": "#FF5733",
    "image_url": null,
    "created_at": "2025-12-07T10:00:00.000Z",
    "updated_at": "2025-12-07T11:00:00.000Z"
  }
}
```

**エラーレスポンス**:
- `401`: 認証トークンが無効
- `404`: カテゴリーが見つからない、または画像が設定されていない
- `500`: サーバーエラー

---

### ユーザーAPI（/api/users）

すべてのエンドポイントで認証が必要です。

#### GET /api/users/me
ユーザー情報の取得

**認証**: 必要

**レスポンス（成功: 200）**:
```json
{
  "user": {
    "id": 1,
    "user_name": "山田太郎",
    "email": "user@example.com",
    "avatar_url": "uploads/avatar-1234567890.jpg"
  }
}
```

**エラーレスポンス**:
- `401`: 認証トークンが無効
- `404`: ユーザーが見つからない
- `500`: サーバーエラー

---

#### PUT /api/users/profile
プロフィール情報の更新

**認証**: 必要

**リクエスト**:
- Content-Type: `multipart/form-data`
- ボディ:
  - `user_name` (string, 任意): ユーザー名
  - `avatar` (file, 任意): アバター画像

**レスポンス（成功: 200）**:
```json
{
  "message": "プロフィールを更新しました",
  "user": {
    "id": 1,
    "user_name": "山田花子",
    "email": "user@example.com",
    "avatar_url": "uploads/avatar-1234567890.jpg"
  }
}
```

**エラーレスポンス**:
- `400`: 画像アップロードエラー
- `401`: 認証トークンが無効
- `500`: サーバーエラー

**注意**: メールアドレスは変更できません。

---

### その他のAPI

#### GET /api/test-db
データベース接続テスト

**認証**: 不要

**レスポンス（成功: 200）**:
```json
{
  "message": "データベース接続に成功しました！",
  "solution": 2
}
```

---

## 画像URLの取得

アップロードされた画像は、以下のURLでアクセスできます：

```
http://<server-host>:3000/<image_url>
```

例:
```
http://localhost:3000/uploads/1234567890-filename.jpg
http://localhost:3000/uploads/categories/category-1234567890.jpg
http://localhost:3000/uploads/avatar-1234567890.jpg
```

---

## エラーレスポンス形式

すべてのエラーは以下の形式で返されます：

```json
{
  "message": "エラーメッセージ",
  "error": "詳細なエラー情報（開発環境のみ）"
}
```

## HTTPステータスコード

- `200`: 成功
- `201`: 作成成功
- `400`: リクエストエラー（バリデーションエラーなど）
- `401`: 認証エラー（トークンが無効など）
- `404`: リソースが見つからない
- `409`: 競合エラー（メールアドレス重複など）
- `500`: サーバーエラー

---

## レート制限

現状、レート制限は実装されていません。将来の拡張として検討予定です。

---

## CORS設定

開発環境では、すべてのオリジンからのアクセスを許可しています。
本番環境では、適切なオリジンを設定してください。
