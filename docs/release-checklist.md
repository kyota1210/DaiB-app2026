# DaiB リリース準備チェックリスト

本書は、DaiB アプリを iOS App Store に公開するために運営側で実施すべき**外部手続き**と**設定値の確定**を一覧化したものである。コードベースで対応すべき項目は別紙（[アプリケーション仕様書](アプリケーション仕様書.md) §8 とリポジトリ内のコード）を参照。

最終更新日: 2026-04-26

---

## 1. 開発者アカウント / 運営事業者の確定

### 1.1 Apple Developer Program

- [ ] **Apple Developer Program** に加入（個人 99 USD/年。法人は別途 D-U-N-S 番号が必要）
  - 加入種別の判断: 法人で出すのか、屋号運用（個人事業主）か、純粋に個人か
  - 法人加入が望ましいケース: 信頼性、法人名で表示したい、複数開発者が関わる
  - 個人加入で進めるケース: 個人開発者、屋号なし
- [ ] **Apple ID（管理者用）** 専用アカウントを作成し、2FA を有効化
- [ ] **Bank Information** （収益受取用銀行口座）を登録
- [ ] **Tax Forms** （W-8BEN または同等）を提出
- [ ] **Agreements**（Paid Apps、In-App Purchase 等）に同意

### 1.2 運営事業者情報（特定商取引法に基づく表記用）

サブスクリプション課金を導入する場合、日本では特定商取引法に基づく表記が必要。運営者は以下の情報を確定する。

- [ ] 運営者名（個人の氏名 または 法人名）
- [ ] 運営者所在地（個人事業主でも本籍地ではなく営業所住所が必要）
  - 自宅住所を出したくない場合は **バーチャルオフィス** の利用を検討
- [ ] 連絡先メールアドレス（`support@<ドメイン>` を推奨）
- [ ] 連絡先電話番号（必要時に開示できる体制があれば「請求があれば遅滞なく開示」も可）
- [ ] 返金ポリシー: IAP は Apple の払い戻しに従う旨を明記
- [ ] 動作環境（iOS バージョン）

確定した値は [client-app/screens/SpecifiedCommercialTransactionsScreen.js](../client-app/screens/SpecifiedCommercialTransactionsScreen.js) に反映する（F0-4 で画面を新設）。

### 1.3 Google Play Console（Android 展開する場合）

- [ ] Google Play Console に登録（25 USD 一回払い）
- [ ] Merchant Account（収益受取）を作成
- [ ] Data Safety Form を回答

---

## 2. App Store Connect 側の設定

### 2.1 アプリ登録

- [ ] **アプリ ID** を Apple Developer Portal で登録（Bundle ID = `com.kytm1210.daibapp2026`、[client-app/app.json](../client-app/app.json) と一致）
- [ ] App Store Connect でアプリレコードを作成
- [ ] **Primary Category** を選択（候補: Lifestyle / Photo & Video / Social Networking）
- [ ] **Age Rating** 質問票を回答（UGC を扱うため、ユーザー生成コンテンツ・通報導線について申告）

### 2.2 サブスクリプション商品の登録（F2-2 で利用）

- [ ] サブスクリプション グループを作成（例: `daib_premium`）
- [ ] サブスクリプション商品を登録
  - 商品ID: `com.kytm1210.daibapp2026.premium.monthly`
  - 期間: 1 ヶ月
  - 価格: 980 円（または App Store の価格ティア）
  - 紹介オファー（任意）: 7 日間無料トライアル など
- [ ] **App Store Server Notifications V2** の Webhook URL を設定
  - URL: RevenueCat → Supabase Edge Function `https://<supabase-project>.supabase.co/functions/v1/revenuecat-webhook`
  - Sandbox / Production の両環境で設定
- [ ] **App Store Connect API Key** を発行（Issuer ID, Key ID, p8 ファイルを Supabase Edge Function の Secret に登録）

### 2.3 App Privacy 質問票

[docs/privacy-policy.md](privacy-policy.md) を改訂後、App Store Connect の Data Privacy 質問票で以下を回答：

- 収集データ: メール、ユーザー名、写真、自己紹介、フォロー関係
- 用途: アプリ機能、分析（導入する場合）、広告（AdMob 導入で「Tracking」回答必要）
- 第三者: Supabase（自社運営扱い）、AdMob、Sentry（導入時）

### 2.4 ストア掲載素材

- [ ] **アプリ名（30 文字以内）**: 「DaiB」
- [ ] **サブタイトル（30 文字以内）**: 確定する
- [ ] **プロモテキスト（170 文字以内）**: 確定する
- [ ] **説明文（4000 文字以内、日本語＋英語）**: 確定する
- [ ] **キーワード（100 文字以内）**: 確定する
- [ ] **サポート URL**: F0-3 で確定する公開ホストの `/support` を指す
- [ ] **マーケティング URL**（任意）
- [ ] **プライバシーポリシー URL**: F0-3 のホスト上で公開（`/privacy.html` 等）
- [ ] **スクリーンショット**:
  - iPhone 6.9"（iPhone 16 Pro Max 等）: 最低 3 枚、最大 10 枚
  - iPhone 6.5"（iPhone 11 Pro Max 等）: 最低 3 枚、最大 10 枚
  - iPhone 5.5"（iPhone 8 Plus 等）: 最低 3 枚、最大 10 枚
  - iPad（[client-app/app.json](../client-app/app.json) で `supportsTablet: true` のため）: 12.9"・11" 各最低 3 枚
- [ ] **App Preview 動画**（任意）

---

## 3. ドメイン / インフラ確定（F0-3 と連動）

- [ ] 公開用ドメインを取得（例: `daib.app` / `daib-app.example` 等）
- [ ] **招待中継ホスト**用のサブドメイン: `https://invite.<domain>`
- [ ] **Universal Links** 用の `apple-app-site-association` を `/.well-known/` に配置
- [ ] **Supabase Auth Redirect URL** を本番ドメイン用に追加（`Authentication → URL Configuration`）
- [ ] **TLS 証明書**（Let's Encrypt 推奨。ホスティング先により自動更新される）

---

## 3.x Supabase Auth の本番設定（F0-6 関連）

prod 環境の Supabase Studio → `Authentication → Providers / Settings` で以下を確実に有効化する。`supabase/config.toml` はローカル開発設定なので、本番への反映は管理画面で別途必須。

- [ ] **Email Provider** を ON
- [ ] **Confirm email** を ON（メール認証必須化。これが OFF だと未確認メールでもログインできてしまう）
- [ ] **Secure email change** を ON（メール変更時に旧アドレスへ確認メール）
- [ ] **Secure password change** を ON 推奨（パスワード変更時に再認証要求）
- [ ] **Disable signups** はデフォルト OFF のまま（招待制にする場合は別ポリシー）
- [ ] SMTP 設定: 独自 SMTP（SendGrid 等）を構成。Supabase デフォルト SMTP は本番不可
- [ ] テンプレート（Confirm signup / Reset password / Magic Link / Change Email）を日本語に整備し、`site_url` と `additional_redirect_urls` を本番ドメイン基準に更新

---

## 4. その他の運営手続き

- [ ] **個人情報保護法** に基づく Privacy Policy の改訂（F0-4）
- [ ] **資金決済法**: IAP のみ（自社決済しない）であれば対象外
- [ ] **景品表示法**: 広告表記の整合（プレミアム表現に注意）
- [ ] **コンテンツモデレーション運用**:
  - 通報の受付チャネル
  - 24 時間以内の対応運用フロー（Apple Guideline 1.2）
  - エスカレーション手順
- [ ] **インシデント対応窓口**: 連絡先と対応 SLA を文書化

---

## 5. 進捗管理

各項目の完了状況は GitHub Issues / プロジェクトボード等で管理する。本ドキュメントは「何が必要か」の一覧であり、実際の進捗トラッキングは別ツールで行うこと。

