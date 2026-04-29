# EAS Build / Submit ガイド

DaiB iOS アプリの EAS（Expo Application Services）によるビルド・配信運用手順。`client-app/eas.json` の各プロファイルと対応している。

最終更新日: 2026-04-26

---

## 1. 前提

- Expo アカウント取得済み（`expo login`）
- Apple Developer Program 加入済み（[release-checklist.md §1.1](release-checklist.md)）
- リポジトリの **`client-app/`** が EAS のプロジェクトルート（`app.json` と `eas.json` がここに置かれている）
- ローカルに Node 20 以降、`npm i -g eas-cli`

```bash
cd client-app
npm install
npx eas-cli login
npx eas-cli init       # 初回のみ。app.json の extra.eas.projectId と owner を埋める
```

---

## 2. プロファイル設計

| プロファイル | 用途 | distribution | channel | EXPO_PUBLIC_APP_ENV |
|---|---|---|---|---|
| `development` | Dev Client（実機デバッグ） | internal | development | development |
| `preview` | TestFlight / 内部配布 | internal | preview | preview |
| `production` | App Store Connect 提出 | store | production | production |

`channel` は EAS Update を使う場合の OTA 配信レーン。Dev Client / プレビュー / 本番で OTA を分離するための識別子。

---

## 3. EAS Secrets の登録

`EXPO_PUBLIC_*` 系の環境変数は EAS Secrets でビルドプロファイルごとに登録する。最低限必要なキーは以下。

```bash
cd client-app

# 共通（dev / preview / production それぞれに登録）
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value 'https://<project>.supabase.co'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value '<anon publishable key>'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SERVER_URL --value 'https://invite.<your-domain>'

# F2-1 で AdMob 導入後に追加
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID --value '...'

# F2-2b で IAP 導入後に追加
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_IAP_PRODUCT_ID_PREMIUM_MONTHLY --value 'com.kytm1210.daibapp2026.premium.monthly'

# F2-4 で Sentry 導入後に追加
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value 'https://xxxx@oXXXX.ingest.sentry.io/XXXX'
```

> **環境ごとに値を分けたい場合**は、`eas.json` の各 build プロファイルの `env` ブロックに値を直接書く（公開してよいIDのみ）か、`--scope project` ではなく `--profile <name>` を使ってプロファイル単位の Secret を登録する。

### 確認

```bash
npx eas-cli secret:list
```

---

## 4. Dev Client への移行

`react-native-google-mobile-ads` / `react-native-purchases` などのネイティブモジュールは **Expo Go では動かない**ため、開発時から Dev Client を使う運用に切り替える。

### 4.1 Dev Client iOS シミュレータビルド

```bash
cd client-app
npm run build:dev:ios
```

ビルド完了後、EAS のページから `.app` をダウンロード → シミュレータにドラッグ＆ドロップ、または `eas-cli build:run --platform ios --profile development` で自動インストール。

### 4.2 実機 Dev Client ビルド

実機に入れる場合は `eas.json` の `development.ios.simulator` を `false` に書き換えるか、別プロファイル `development-device` を切って `simulator: false` にする。Apple Developer の Provisioning は EAS が自動管理する（初回はブラウザで Apple ID 認証を要求される）。

### 4.3 Metro 起動

```bash
npm start            # Dev Client 用に起動（--dev-client 付き）
npm run start:expo-go  # Expo Go で起動したい場合
```

---

## 5. TestFlight 配布（preview）

```bash
cd client-app
npm run build:preview:ios       # ビルド
npm run submit:preview:ios      # 完了したビルドを TestFlight に submit
```

submit 前に [`eas.json` の `submit.preview.ios.appleId` / `ascAppId` / `appleTeamId`](../client-app/eas.json) を実値に置換。

---

## 6. App Store 提出（production）

```bash
cd client-app
npm run build:production:ios
npm run submit:production:ios
```

`autoIncrement: true` により buildNumber が自動採番される。`version`（マーケティングバージョン）は `app.json` を更新してコミット。

---

## 7. 今後の TODO（このフェーズで埋めるべき値）

- [ ] `app.json` の `extra.eas.projectId` を `eas init` で取得した値に置換
- [ ] `app.json` の `owner` を Expo アカウント名に置換
- [ ] `eas.json` の `submit.*.ios.appleId` / `ascAppId` / `appleTeamId` を実値に置換
- [ ] EAS Secrets を上記 §3 に従って登録
- [ ] ローカルから `npm run build:dev:ios` で Dev Client 初回ビルドが通ることを確認
