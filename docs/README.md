# DaiB アプリケーション

## ドキュメント正本

**[アプリケーション仕様書](アプリケーション仕様書.md)**（システム構成、DB、現行の認証/データアクセス方針）を参照してください。  
以降のセクションは**開発者向けクイックスタート**であり、技術的な正本は仕様書と `supabase/migrations/` です。

## アプリ概要

DaiB（デイビー）は、日々の記録（**投稿**）を写真とテキストで作成・管理し、**相互承認（フレンド）**相手の投稿をスレッドで閲覧するモバイルアプリです。  
**認証・永続層**は [Supabase](https://supabase.com/)（Auth、PostgreSQL、Row Level Security、Storage、RPC）を用い、クライアント（Expo）が **Supabase JS** で直接アクセスします。従来の自前 `server-api` 上の `/api` REST は **廃止（HTTP 410）** です。

### 主要機能

- **ユーザー認証**: メールアドレスとパスワード（Supabase Auth）。パスワード再発行。セッションは SecureStore 経由で永続化
- **投稿管理**（旧称: 記録）: 作成・閲覧・更新・論理削除、Storage 上の画像、カテゴリー、タイムライン表示の可否
- **カテゴリー管理**: ユーザー単位、論理削除・並び順等（スキーマは移行段階で差異の可能性あり）
- **画像管理**: 投稿・プロフィール画像（Supabase Storage; 旧 `server-api/uploads` 方式は非推奨）
- **フレンド・スレッド**: フォロー申請/承認、**フレンド**の直近7日分投稿を `get_timeline_posts` RPC で表示。友だち追加に **QR/招待URL**（文言検索は現行の主導線ではない）
- **反応（リアクション）**: 定義絵文字による投稿への反応
- **表示設定**: 一覧の表示形式、並び順
- **多言語対応**: 日本語・英語
- **テーマ**: 実装状況は画面により異なる（テーマ専用画面の有無は [画面一覧](screen-list.md) を参照）

## 起動方法

### 前提条件

- Node.js (v18以上推奨)
- [Supabase](https://supabase.com/) プロジェクト（URL、anon キー、本リポジトリの `supabase/migrations` を適用した DB）
- npm または yarn
- （任意）`server-api` を招待用 HTML/レガシー互換のためだけ起動

### サーバー側（補助・任意）の起動

```bash
cd server-api
npm install
# 招待リンクのホスト用。/api/* は 410 を返す。

node server.js
```

`http://localhost:3000`（`.env` の `PORT`）で起動します。**メインの API ではない**点に注意（仕様は [アプリケーション仕様書](アプリケーション仕様書.md)）。

### クライアント側（モバイルアプリ）の起動

```bash
cd client-app
npm install

# .env 例: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY（必須）
# config.js: SERVER_URL（QR招待用の自機 IP 等）、必要に応じて

npx expo start
```

Expo開発サーバーが起動したら、以下のいずれかの方法でアプリを起動できます：

- **iOS**: `i` キーを押すか、Expo GoアプリでQRコードをスキャン
- **Android**: `a` キーを押すか、Expo GoアプリでQRコードをスキャン
- **Web**: `w` キーを押す

## プロジェクト構成

```
daib-app/
├── client-app/              # フロントエンド（React Native + Expo + Supabase JS）
│   ├── api/                 # supabaseData 等へのファサード
│   ├── context/
│   ├── navigation/
│   ├── screens/
│   ├── utils/supabase.js
│   └── ...
│
├── server-api/              # 補助: 招待HTML、/api は 410
│   └── server.js
│
├── supabase/                # Postgres スキーマ・RLS・RPC・Storage 方針
│   └── migrations/
│
├── docs/
│   ├── アプリケーション仕様書.md
│   ├── supabase-route-inventory.md
│   └── ...
│
└── Doc/DDL/                 # 旧 MySQL 設計（参考）
```

## 技術スタック

### フロントエンド

- **React Native** / **Expo**（`client-app/package.json` 参照）
- **@supabase/supabase-js**: Auth・DB・Storage
- **React Navigation**: 画面遷移
- **expo-secure-store**: セッション（Supabase ストレージアダプタ）
- その他: 画像・カメラ・ぼかし 等

### バックエンド（BaaS）

- **Supabase**（Auth / PostgreSQL / RLS / Storage / RPC）
- クライアントは **主に** `api/supabaseData.js` 経由で PostgREST・RPC・Storage を呼び出す

### 補助プロセス

- **server-api**: Express（招待ページ、`/api` 410 応答）。MySQL2 等の依存はレガシー用に `package.json` に残存する可能性あり

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd daib-app
```

### 2. データベース（Supabase）のセットアップ

Supabase 上で新規プロジェクトを作成し、本リポジトリ `supabase/migrations/` を順に適用する（CLI: `supabase db push` / SQL Editor 等）。

### 3. 環境変数

**`client-app/.env`**（例）:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_...
```

**`server-api`**（任意起動の場合）: ポート等のみ。MySQL 用の `.env` は **旧構成**用。

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

- **[アプリケーション仕様書](アプリケーション仕様書.md)**（全体正本・構成図）
- [ビジョン・目的](vision.md)
- [要件定義](requirements.md) ※先頭の「実装状況メモ」参照
- [ユーザーストーリー](user-stories.md)
- [画面一覧・遷移](screen-list.md)
- [データモデル](data-model.md) ※**旧 MySQL 記述。現行は仕様書と migrations**
- [API仕様](api.md) ※**廃止された REST 記述**
- [Supabase 移行ルート棚卸](supabase-route-inventory.md)
- [アーキテクチャ決定記録](adr/)
