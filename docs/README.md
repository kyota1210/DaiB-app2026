# Otium アプリケーション

## アプリ概要

Otium（オーティアム）は、ユーザーが日々の記録を写真と共に作成・管理できるモバイルアプリケーションです。JWT認証により、各ユーザーは自分の記録のみにアクセスでき、セキュアな環境で記録を管理できます。

### 主要機能

- **ユーザー認証**: メールアドレスとパスワードによる登録・ログイン（JWT認証）
- **記録管理**: 写真付き記録の作成・閲覧・更新・削除（CRUD操作）
- **カテゴリー管理**: 記録をカテゴリーで分類・管理
- **画像管理**: 記録に画像を添付可能
- **フォロー・タイムライン**: ユーザー検索、フォロー、フォロー中ユーザーの記録をタイムライン表示
- **表示設定**: 一覧の表示形式（グリッド/リスト/ブックリスト/タイル）、並び順の設定
- **多言語対応**: 日本語・英語対応
- **テーマ設定**: ライト/ダークモード対応

## 起動方法

### 前提条件

- Node.js (v18以上推奨)
- MySQL (v8.0以上)
- npm または yarn
- Expo CLI (クライアント側)

### サーバー側（API）の起動

```bash
cd server-api
npm install

# .envファイルを作成して以下を設定
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_DATABASE=otium
# JWT_SECRET=your_super_secret_key_here
# PORT=3000

node server.js
```

サーバーは `http://localhost:3000` で起動します。

### クライアント側（モバイルアプリ）の起動

```bash
cd client-app
npm install

# config.jsでAPI_BASE_URLとSERVER_URLを環境に合わせて設定
# 開発環境のIPアドレスに変更してください

npx expo start
```

Expo開発サーバーが起動したら、以下のいずれかの方法でアプリを起動できます：

- **iOS**: `i` キーを押すか、Expo GoアプリでQRコードをスキャン
- **Android**: `a` キーを押すか、Expo GoアプリでQRコードをスキャン
- **Web**: `w` キーを押す

## プロジェクト構成

```
otium-app/
├── client-app/              # フロントエンド（React Native + Expo）
│   ├── api/                # API通信関連（共通クライアント・各モジュール）
│   ├── assets/             # 画像・アイコン
│   ├── components/         # 共通UIコンポーネント
│   ├── context/            # React Context（認証・テーマ・言語・記録&カテゴリー）
│   ├── locales/            # 多言語翻訳データ（ja.js / en.js）
│   ├── navigation/         # ナビゲーション設定
│   ├── screens/            # 画面コンポーネント
│   ├── utils/              # ユーティリティ関数
│   ├── App.js              # アプリエントリーポイント
│   └── package.json
│
├── server-api/             # バックエンド（Node.js + Express）
│   ├── middleware/        # 認証ミドルウェア
│   ├── models/            # データモデル
│   ├── scripts/           # DB初期化スクリプト
│   ├── uploads/           # アップロードされた画像ファイル
│   ├── authRoutes.js      # 認証API
│   ├── recordsRoutes.js   # 記録API
│   ├── categoryRoutes.js  # カテゴリーAPI
│   ├── userRoutes.js      # ユーザーAPI
│   ├── followsRoutes.js   # フォローAPI
│   ├── threadsRoutes.js   # スレッド・タイムラインAPI
│   ├── db.js              # DB接続設定
│   ├── server.js          # サーバーエントリーポイント
│   └── package.json
│
├── docs/                   # 設計ドキュメント
│   ├── README.md          # このファイル
│   ├── vision.md          # ビジョン・目的
│   ├── requirements.md    # 要件定義
│   ├── user-stories.md    # ユーザーストーリー
│   ├── screen-list.md     # 画面一覧・遷移
│   ├── data-model.md      # データモデル
│   ├── api.md             # API仕様
│   └── adr/               # アーキテクチャ決定記録
│
└── Doc/                    # データベース設計ファイル
    └── DDL/
        └── otium.a5er     # A5:SQL Mk-2 データベース設計ファイル
```

## 技術スタック

### フロントエンド

- **React Native**: 0.81.5
- **Expo**: ~54.0.25
- **React Navigation**: ^7.1.24（画面遷移）
- **Expo Secure Store**: ~15.0.8（トークン保存）
- **Expo Image Picker**: ~17.0.10（画像選択）
- **Expo Image Manipulator**: ~14.0.8（画像編集）
- **Expo Blur**: ^15.0.8（ぼかしエフェクト）

**HTTP通信**: ネイティブ `fetch` API + 共通APIクライアント（`api/client.js` の `apiFetch`）を使用。Axios はパッケージに含まれていますが、主要なAPI通信では使用していません。

### バックエンド

- **Node.js**: 最新LTS版
- **Express**: ^5.1.0
- **MySQL2**: ^3.15.3（データベース接続）
- **jsonwebtoken**: ^9.0.2（JWT認証）
- **bcrypt**: ^6.0.0（パスワードハッシュ化）
- **Multer**: ^2.0.2（ファイルアップロード）
- **CORS**: ^2.8.5（クロスオリジン対応）

### データベース

- **MySQL**: 8.0以上

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd otium-app
```

### 2. データベースのセットアップ

MySQLにデータベースを作成し、テーブルを作成します。

```sql
CREATE DATABASE otium CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE otium;
```

テーブル作成スクリプトは `server-api/scripts/` ディレクトリにあります。

### 3. 環境変数の設定

`server-api/.env` ファイルを作成：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=otium
JWT_SECRET=your_super_secret_key_here
PORT=3000
```

### 4. 依存関係のインストール

```bash
# サーバー側
cd server-api
npm install

# クライアント側
cd ../client-app
npm install
```

### 5. アプリの起動

サーバーとクライアントを別々のターミナルで起動：

```bash
# ターミナル1: サーバー起動
cd server-api
node server.js

# ターミナル2: クライアント起動
cd client-app
npx expo start
```

## 設計ドキュメントの更新ルール

コードを実装するときは、同時にドキュメントの更新も行うこと。
ドキュメントを更新したときにはコードの実装を行わない。
ただし、「ドキュメントを参照して実装して」という指示があった場合は、ドキュメントを参照して実装を行うこと。

## 関連ドキュメント

- [ビジョン・目的](vision.md)
- [要件定義](requirements.md)
- [ユーザーストーリー](user-stories.md)
- [画面一覧・遷移](screen-list.md)
- [データモデル](data-model.md)
- [API仕様](api.md)
- [アーキテクチャ決定記録](adr/)
