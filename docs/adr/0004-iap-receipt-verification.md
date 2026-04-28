# ADR-0004: IAP レシート検証アーキテクチャ

## ステータス

承認済み（2026-04-26）

## コンテキスト

DaiB iOS 版でプレミアムプラン（月額サブスクリプション）を導入するにあたり、Apple StoreKit 経由の購入レシートを検証し、ユーザーごとの購読状態を管理する仕組みが必要になった。検討時点で取り得る選択肢は次の 3 つだった。

1. **クライアントのみで完結**（StoreKit 2 の `Transaction.currentEntitlements` を毎回参照）
2. **クライアント → 自前 Express バックエンド → Apple verifyReceipt API**
3. **クライアント → Supabase Edge Function → Apple App Store Server API（推奨）**

クライアントのみで判定する案は、ジェイルブレイク端末や StoreKit のオフライン状態でなりすましが可能で、また機能ゲート（`subscriptions` テーブル参照）をサーバー側で行えなくなる。Express を増設する案は `server-api` の役割を膨張させ、F0-3 で確定した「招待ホスト以外は Edge Functions に寄せる」運用方針に逆行する。

加えて、Apple は旧 `verifyReceipt` API（JSON receipt）を非推奨にしており、新規実装は **App Store Server API**（`/inApps/v1/subscriptions/{originalTransactionId}`）と **App Store Server Notifications V2** を使うことが推奨されている。

## 決定事項

クライアントは購入完了 / 復元時に `originalTransactionId` を Supabase Edge Function に送り、サーバー側で Apple App Store Server API に問い合わせて状態を取得し、`public.subscriptions` テーブルに upsert する。あわせて App Store Server Notifications V2 を受ける Webhook を Edge Function として用意し、解約・更新・払い戻しを反映する。

具体的な構成：

- DB: `public.subscriptions(user_id, store, product_id, original_transaction_id, status, expires_at, auto_renew, ...)`（migration `20260504_subscriptions_table.sql`）
- 状態判定 RPC: `public.is_current_user_premium()`（`status in ('active','grace_period','in_billing_retry') AND expires_at > now()`）
- Edge Function: `verify-iap-receipt`（クライアント呼び出し用）/ `apple-iap-webhook`（Apple からの V2 通知受信用）
- 共有ヘルパー: `supabase/functions/_shared/appleIap.ts`（JWT 生成、JWS デコード、ステータス変換）
- クライアント: `react-native-iap` を `purchaseUpdatedListener` から `verify-iap-receipt` に投げる
- 機能ゲート: `client-app/context/SubscriptionContext.js`（`isPremium`）+ `client-app/hooks/useFeatureGate.js`

## 決定理由

1. **不正対策**: Service Role Key で `subscriptions` を書き換えるのはサーバー側のみ。クライアントから直接の write はできない（RLS で禁止）。
2. **公式 API 準拠**: 旧 verifyReceipt は段階的廃止予定。新規実装は App Store Server API を使う。
3. **Webhook で解約 / 払い戻しの反映が確実**: 自動更新がオフになったケースや、Apple サポート経由の払い戻しはクライアントから検知できないため、V2 通知で同期する。
4. **既存方針との整合**: バックエンドは Supabase Edge Functions に寄せる方針（F0 でも踏襲）。

## 考慮した代替案

### A. クライアントのみで判定

- メリット: 実装が最小、サーバー不要。
- デメリット: なりすまし不可能性が低い、Webhook で解約反映できない、複数デバイスで状態を共有できない。
- 結論: 不採用。

### B. 自前 Express + 旧 verifyReceipt

- メリット: 既存の `server-api` 上で完結できる。
- デメリット: API が非推奨、運用ホスト追加コスト、Service Role Key を別環境に配布する必要。
- 結論: 不採用。

### C. RevenueCat 等の SaaS 利用

- メリット: 検証 / Webhook 受信を丸投げできる。Android との互換性も得やすい。
- デメリット: 月額従量課金、PII を第三者に渡す、解約時のロックイン。
- 結論: iOS 単独の現フェーズではオーバースペック。将来 Android 対応 + 売上が一定額を超えた段階で再評価する。

## 実装詳細

### サーバー側

- `verify-iap-receipt`: 認証ユーザー JWT を検証 → `originalTransactionId` を Apple に問い合わせ → JWS デコード → `subscriptions` に upsert。`isRateLimited` で 60 秒 10 回まで制限。
- `apple-iap-webhook`: Apple の署名 JWS をデコードし、`notificationType`（`SUBSCRIBED`, `DID_RENEW`, `EXPIRED`, `REVOKE`, `REFUND` 等）から `subscriptions.status` を更新。
- 共有秘密鍵 `APPLE_IAP_PRIVATE_KEY` / `APPLE_IAP_KEY_ID` / `APPLE_IAP_ISSUER_ID` / `APPLE_BUNDLE_ID` は Supabase Secrets で管理。

### クライアント側

- `client-app/utils/iap.js`: `react-native-iap` を Expo Go 安全に wrap。
- `client-app/screens/PremiumPlanScreen.js`: 購入 / 復元 / サブスクリプション管理（App Store の管理画面遷移）の動線。
- `client-app/context/SubscriptionContext.js`: `subscriptions` テーブルから自分の行を取得し `isPremium` を導出。`AuthContext` の変更で再取得。

### 復元フロー（Apple 必須）

PremiumPlanScreen に "購入を復元" ボタンを置き、`getAvailablePurchases()` の結果を `verify-iap-receipt` に投げて再同期する。

## 制約事項 / 既知の課題

- Sandbox 環境では `expires_at` が極端に短い（数分）ため、E2E テスト時はその挙動を考慮（`docs/testflight-e2e-checklist.md` 参照）。
- ファミリー共有は v1 では未対応。`familyShared` フラグを将来 `subscriptions` に追加する余地あり。
- Android は本 ADR の対象外。Google Play Billing 対応時に別 ADR を起票。

---

**作成日**: 2026-04-26  
**作成者**: 開発チーム  
**関連ADR**: ADR-0003（React Native / Expo）  
**関連 migration**: `supabase/migrations/20260504_subscriptions_table.sql`
