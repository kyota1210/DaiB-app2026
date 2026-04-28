# ADR-0005: AdMob 広告統合と ATT / UMP 同意フロー

## ステータス

承認済み（2026-04-26）

## コンテキスト

無料プランで広告を表示しつつ、プレミアム購読者には広告を出さない構成を採用する。Expo / React Native 環境で広告 SDK を選定する際、選択肢は次のとおりだった。

1. `expo-ads-admob`（旧 Expo モジュール、SDK 49 で deprecated → SDK 50 で削除）
2. `react-native-google-mobile-ads`（公式 Google Mobile Ads SDK のラッパー、Expo Config Plugin あり）
3. RevenueCat / 第三者媒介ネットワーク

加えて、iOS 14.5 以降は **App Tracking Transparency（ATT）** 同意が必要で、EU/EEA/UK ユーザー向けには **UMP SDK（Google CMP）** での GDPR 同意取得が義務化されている。SKAdNetwork も iOS 17+ 以降は AdMob から SKAdNetworkItems を取得して `Info.plist` に登録する必要がある。

## 決定事項

`react-native-google-mobile-ads` を採用し、Expo Config Plugin で `Info.plist` の `SKAdNetworkItems` と `GADApplicationIdentifier`、`NSUserTrackingUsageDescription` を自動注入する。同意フローはアプリ初回起動時に **UMP → ATT → AdMob 初期化** の順で実行する。

具体的な構成：

- 依存: `react-native-google-mobile-ads`、`expo-tracking-transparency`
- 設定: `client-app/app.json` の `plugins` に両者を登録、`SKAdNetworkItems` と `iosAppId` をテスト ID で構成（本番 ID は EAS Secrets 経由で置換）
- 初期化: `client-app/utils/ads.js` の `initAds()` を `App.js` 起動時に呼ぶ。Expo Go 検出時は no-op。
- バナー: `client-app/components/AdBanner.js`（プレミアム時 `null`）
- インタースティシャル: `client-app/utils/interstitialAd.js`（投稿作成完了直後に低頻度で表示、プレミアム時は出さない）
- ATT: `expo-tracking-transparency` の `requestTrackingPermissionsAsync()`。拒否時は `nonPersonalizedAdsOnly: true` で AdMob 初期化。
- UMP: `AdsConsent`（`react-native-google-mobile-ads/consent`）で同意フォームを表示。

## 決定理由

1. **公式メンテナンス**: Google が公式にリリースしている SDK のラッパーであり、AdMob の新機能・バグ修正に追随できる。
2. **Expo 互換**: Config Plugin で `Info.plist` 注入が完結し、`prebuild` を要求しない。
3. **ATT / UMP 統合**: SDK 内に Consent Information / Form の API があり、iOS 14.5 以降の必須要件を満たせる。
4. **`expo-ads-admob` の廃止**: 既に Expo 側でサポート終了しており、新規採用不可。

## 考慮した代替案

### A. `expo-ads-admob`

- メリット: Expo Go で動く（過去）。
- デメリット: SDK 49 で deprecated、SDK 50 で削除。Expo SDK 54 では使用不可。
- 結論: 採用不可。

### B. RevenueCat の AdMob 連携

- メリット: 課金管理と統合できる。
- デメリット: 広告管理は本体機能ではなく統合範囲が浅い。
- 結論: 不採用。

## 実装詳細

### 同意フロー

1. アプリ起動 → `App.js` の useEffect で `initAds()`
2. UMP SDK で同意ステータスを更新 → 必要なら同意フォームを表示
3. iOS なら ATT ダイアログを `requestTrackingPermissionsAsync()` で表示
4. ATT が `denied` または UMP が non-personalized 同意なら、`mobileAds().setRequestConfiguration({ tagForChildDirectedTreatment: false })` + リクエスト時に `nonPersonalizedAdsOnly: true`
5. `mobileAds().initialize()` 完了後にバナー / インタースティシャルを準備

### 広告 ID 管理

| 種別 | 開発 / テスト | 本番 |
|---|---|---|
| iOS App ID | `ca-app-pub-3940256099942544~1458002511` | EAS Secret `ADMOB_IOS_APP_ID` |
| Banner Unit ID | `ca-app-pub-3940256099942544/2934735716` | EAS Secret `ADMOB_BANNER_UNIT_ID_IOS` |
| Interstitial Unit ID | `ca-app-pub-3940256099942544/4411468910` | EAS Secret `ADMOB_INTERSTITIAL_UNIT_ID_IOS` |

`__DEV__` か `Constants.executionEnvironment === 'storeClient'` でテスト ID にフォールバックする。

### プレミアム判定との連携

`SubscriptionContext.isPremium === true` のとき、`AdBanner` は `null` を返し、`showInterstitialIfReady({ isPremium })` も即 return する。これにより、ADR-0004 の購読状態が広告抑制に直結する。

### App Privacy 質問票（App Store Connect）

AdMob 統合により以下に該当する：

- データ収集: **User ID / Device ID / Coarse Location**（personalized ads 同意時）
- 用途: **Third-Party Advertising**
- リンク済み: あり
- 追跡（Tracking）: 有り（personalized ads 同意時のみ）

`docs/store-listing.md` の質問票テンプレートに同期。

## 制約事項 / 既知の課題

- インタースティシャルは UX 影響が大きいため、表示頻度は最大でも 1 日 1〜2 回（投稿作成完了直後）に絞る。`utils/interstitialAd.js` 側に cooldown を実装済み。
- 子ども向けカテゴリで配信する場合は `tagForChildDirectedTreatment` を有効化する必要があるが、本アプリはターゲット 13+ のため不要。
- インタースティシャルの動画素材により、ロード時間が長くアプリが固まったように見える事象が報告されている。Sentry Performance を監視する。

---

**作成日**: 2026-04-26  
**作成者**: 開発チーム  
**関連 ADR**: ADR-0003（React Native / Expo）、ADR-0004（IAP）  
**関連実装**: `client-app/utils/ads.js`, `client-app/components/AdBanner.js`, `client-app/utils/interstitialAd.js`
