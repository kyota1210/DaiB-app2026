# App Store 掲載素材ガイド（DaiB iOS）

App Store Connect に登録する各テキスト・画像・質問票回答のテンプレートとチェックリスト。確定したら App Store Connect の各フィールドに貼り付ける。

最終更新日: 2026-04-26

---

## 1. アプリ基本情報

| フィールド | 制限 | 値（案） |
|---|---|---|
| App Name | 30 字 | DaiB |
| Subtitle | 30 字 | （要確定） *日々を残す、シンプルな日記* など |
| Bundle ID | - | `com.kytm1210.daibapp2026` |
| SKU | 自由 | `daib-ios-2026` |
| Primary Category | - | Lifestyle（候補: Photo & Video / Social Networking） |
| Secondary Category | - | Photo & Video |
| Age Rating | - | 17+（UGC・チャット・写真の可能性のため厳しめ申告。ガイドライン 1.2 連動） |

---

## 2. ローカライゼーション（日本語）

### 2.1 Promotional Text（170 字以内）

> 大切な日々を、自分のペースで。DaiB は記録・写真・カテゴリで「自分史」を作る日記アプリ。フレンドのタイムラインも楽しめる、心地よい記録の習慣を。

### 2.2 Description（4000 字以内）

```
DaiB は、毎日の出来事や気持ちをシンプルに残せる日記アプリです。

■ できること
- 写真と一緒に日記を投稿
- カテゴリで自動的に整理（旅行・食事・趣味…）
- フレンド申請でつながり、限定したタイムラインを共有
- 過去の今日（年前メモリー）を自動でリサーフェス

■ プレミアムプラン（任意）
- 広告非表示
- 詳細な統計
- ストレージ容量の拡張
（月額の自動更新サブスクリプションです。詳細は本文末尾）

■ こだわり
- 余計な通知を出さない、静かな UI
- ダークモード対応
- 日本語・英語に対応

■ サブスクリプションについて
- 商品名: DaiB プレミアム（月額）
- 期間: 1 ヶ月（自動更新）
- 価格: 980 円 / 月
- 自動更新は期間終了の 24 時間以上前にキャンセルしない限り、同額で更新されます
- 設定 → Apple ID → サブスクリプションからいつでもキャンセル可能
- 利用規約: https://<host>/terms.html
- プライバシーポリシー: https://<host>/privacy.html
```

> ホスト URL は F0-3 で確定したドメインに置換すること。

### 2.3 Keywords（100 字以内、カンマ区切り）

```
日記,ライフログ,記録,フォトログ,メモリー,カテゴリ,フレンド,ダイアリー,写真,習慣
```

### 2.4 Support URL / Marketing URL

| フィールド | 値 |
|---|---|
| Support URL | `https://<host>/support` |
| Marketing URL（任意） | `https://<host>/` |
| Privacy Policy URL | `https://<host>/privacy.html` |
| Terms (EULA) URL | `https://<host>/terms.html` |

---

## 3. ローカライゼーション（英語）

### 3.1 Promotional Text

> Keep the moments that matter. DaiB is a calm, photo-friendly journaling app with categories and a friends-only timeline.

### 3.2 Description

```
DaiB is a simple journaling app that lets you capture daily moments — text, photos, and categories — at your own pace.

■ Features
- Add photos to your daily entries
- Auto-organize entries by categories (travel, food, hobbies...)
- Connect with friends and share a private timeline
- "Years ago today" memories resurfaced automatically

■ Premium Plan (Optional)
- Remove ads
- Detailed stats
- Expanded storage
(Monthly auto-renewing subscription — see bottom of this description)

■ Subscription Details
- Title: DaiB Premium (Monthly)
- Length: 1 month, auto-renewing
- Price: 980 JPY / month
- Auto-renew unless cancelled at least 24 hours before the period ends
- Manage / cancel anytime: Settings → Apple ID → Subscriptions
- Terms of Use: https://<host>/terms.html
- Privacy Policy: https://<host>/privacy.html
```

### 3.3 Keywords

```
journal,diary,photolog,memories,life,categories,friends,timeline,reflect,habit
```

---

## 4. スクリーンショット

iOS 必須サイズ（[Apple ガイドライン](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)）。同じ素材から書き出すために、`assets/store/` 以下にスクショ作成元データを管理する想定。

| デバイス枠 | 画像サイズ（px, 縦） | 必要枚数 |
|---|---|---|
| iPhone 6.9"（iPhone 16 Pro Max など） | 1290 x 2796 | 3-10 |
| iPhone 6.5"（iPhone 11 Pro Max など） | 1242 x 2688 または 1284 x 2778 | 3-10 |
| iPhone 5.5"（iPhone 8 Plus） | 1242 x 2208 | 3-10 |
| iPad Pro 12.9"（第2世代以降） | 2048 x 2732 | 3-10 |
| iPad Pro 12.9"（第6世代） | 2048 x 2732 | 3-10 |

> `app.json` で `supportsTablet: true` のため iPad スクショは必須扱い。提出時に「iPad は使用不可」を明示するなら `supportsTablet: false` に変更すること（F1-2 開始前に判断）。

### 4.1 訴求順（推奨）

1. ホーム / タイムライン（1日の記録の見え方）
2. 投稿作成画面（カテゴリ・写真・本文）
3. メモリー（過去の今日）
4. プロフィール / 統計
5. プレミアム特典の紹介
6. ダークモード版

---

## 5. App Privacy 質問票（App Store Connect）

[docs/privacy-policy.md](privacy-policy.md) と [client-app/screens/PrivacyScreen.js](../client-app/screens/PrivacyScreen.js) の改訂内容に基づく回答。

### 5.1 Data Linked to You（ユーザーIDに紐づく）

| データ種別 | 収集 | 用途 | サードパーティ共有 |
|---|---|---|---|
| Email Address | Yes | App Functionality, Account Management | Supabase（自社運営扱い） |
| Name（user_name 含む） | Yes | App Functionality | Supabase |
| User Content（投稿、写真、コメント等） | Yes | App Functionality | Supabase |
| Photos（投稿に添付） | Yes | App Functionality | Supabase |
| User ID（uuid） | Yes | App Functionality, Analytics | Supabase, Sentry（導入後） |
| Purchases（IAP） | Yes | App Functionality | Apple |
| Crash Data | Yes | App Functionality, Analytics | Sentry（導入後） |

### 5.2 Data Used to Track You（広告のためにトラッキング）

AdMob 導入後に以下を **Yes** で回答する：

| データ種別 | 用途 |
|---|---|
| Device ID（IDFA） | Third-Party Advertising |
| Coarse Location（広告 SDK が取得する場合） | Third-Party Advertising |
| Product Interaction（タップなど） | Third-Party Advertising |

> ATT で「Allow Tracking」を選んだユーザーのみ。拒否時は SKAdNetwork ベースの非個人化広告のみ。

### 5.3 Data Not Linked to You

| データ種別 | 収集 | 用途 |
|---|---|---|
| Diagnostics（クラッシュログ非識別子化） | Yes | Analytics |
| Performance Data | Yes | Analytics |

---

## 6. サブスクリプション商品登録（F2-2 で利用、ここで雛形を確定）

App Store Connect → My Apps → 該当アプリ → **Monetization → Subscriptions**

### 6.1 サブスクリプショングループ

- Reference Name: `daib_premium`
- Group Display Name: `DaiB Premium`

### 6.2 サブスクリプション商品（月額）

| フィールド | 値 |
|---|---|
| Reference Name | DaiB Premium Monthly |
| Product ID | `com.kytm1210.daibapp2026.premium.monthly` |
| Subscription Duration | 1 Month |
| Cleared for Sale | Yes（提出前まではテスター限定） |
| Price | 980 JPY（または T9 価格ティア相当） |
| Family Sharing | OFF（推奨） |

#### Localization（日本語）

| フィールド | 値 |
|---|---|
| Display Name | DaiB プレミアム |
| Description | 広告非表示・詳細統計・ストレージ拡張を含む月額プラン |

#### Localization（英語）

| フィールド | 値 |
|---|---|
| Display Name | DaiB Premium |
| Description | Monthly plan: ad-free, detailed stats, expanded storage |

#### Review Information

- スクリーンショット: PremiumPlanScreen の購入導線が見えるもの（F2-2b 完成後に再提出）
- Review Notes: 「Sandbox アカウントで購入確認可能」と記載

### 6.3 紹介オファー（任意）

- 7 日間無料トライアル を新規ユーザーに付与する場合は Introductory Offers から登録

### 6.4 App Store Server Notifications V2

- Production URL: `https://<supabase-project-ref>.supabase.co/functions/v1/apple-iap-webhook`
- Sandbox URL: 同上
- Version: V2
- 認証: Supabase Edge Function 側で署名検証（F2-2a で実装）

### 6.5 App Store Server API キー

- App Store Connect → Users and Access → Keys → In-App Purchase で API Key を発行
- Issuer ID, Key ID, p8 ファイルの 3 点を Supabase Edge Functions の Secrets に登録（後述）

```bash
supabase secrets set APPLE_IAP_ISSUER_ID=...
supabase secrets set APPLE_IAP_KEY_ID=...
supabase secrets set APPLE_IAP_PRIVATE_KEY="$(cat AuthKey_XXX.p8)"
supabase secrets set APPLE_BUNDLE_ID=com.kytm1210.daibapp2026
```

---

## 7. 進行用チェックリスト

- [ ] 1. アプリ基本情報を確定
- [ ] 2. 日本語コピーを確定（Subtitle / Promotional / Description / Keywords）
- [ ] 3. 英語コピーを確定
- [ ] 4. スクリーンショット 4 サイズ × 5-7 枚を作成
- [ ] 5. App Privacy 質問票に回答（広告 SDK 導入後に再回答が必要）
- [ ] 6. サブスクグループと商品を登録（F2-2a 着手と同時）
- [ ] 7. App Store Server Notifications V2 URL を仮登録（F2-2a で URL 確定後に正式設定）
- [ ] 8. App Store Server API Key を発行し Supabase Secrets に登録
