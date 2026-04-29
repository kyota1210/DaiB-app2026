# ADR-0004: サブスクリプション状態のサーバー同期（RevenueCat）

## ステータス

承認済み（2026-04-26）／ **2026-04-29 更新**: RevenueCat Webhook に一本化

## コンテキスト

DaiB でプレミアムプラン（月額サブスクリプション）を提供するにあたり、**サーバー側で `public.subscriptions` を権威とする**必要がある。クライアントのみの判定はなりすましやサーバー側機能ゲートと両立しない。

当初は App Store Server API を Edge Function から直接呼び出す方式を採用したが、運用の単純化とレシート検証の委託のため **RevenueCat** に移行した。

## 決定事項（現行）

1. **クライアント**: `react-native-purchases`（RevenueCat SDK）。ログイン後に `Purchases.logIn(<Supabase auth user id>)` とし、`app_user_id` を UUID と一致させる。
2. **購入・復元**: SDK が Store と通信し、RevenueCat がレシート検証・エンタイトルメント管理を行う。
3. **サーバー同期**: RevenueCat **Webhook** → Supabase Edge Function `revenuecat-webhook`（`Authorization` シークレットで検証、`verify_jwt = false`）→ `public.subscriptions` を upsert。
4. **アプリ内のプレミアム判定**: `client-app/context/SubscriptionContext.js` が引き続き `subscriptions` を読む（**Supabase 正**）。
5. **Apple 直の Server Notifications** および **クライアント呼び出し型レシート検証 Edge Function** は廃止（旧 `apple-iap-webhook` / `verify-iap-receipt` は削除済み）。

### 構成要素

- DB: `public.subscriptions`（migration `20260504_subscriptions_table.sql`）
- RPC: `public.is_current_user_premium()`
- Edge Function: `revenuecat-webhook`（シークレット `REVENUECAT_WEBHOOK_AUTHORIZATION`）
- クライアント: `client-app/utils/purchases.js`、`PremiumPlanScreen.js`、`AuthContext.js`（configure / logIn / logOut）

## 決定理由

1. **不正対策**: `subscriptions` への書き込みは引き続き service_role（Edge）のみ。
2. **Webhook で解約・失効・課金失敗を即時反映**: RevenueCat が Store イベントを取り込み、Webhook で DB を更新。
3. **Apple / Google の差分を SDK・RC に集約**: クライアントの購入パスを一本化しやすい。

## 履歴（旧構成・参照用）

~~2026-04-26 時点では `verify-iap-receipt`（App Store Server API）と `apple-iap-webhook`（ASN V2）を併用していた。2026-04-29 に RevenueCat のみに移行し、当該関数と `supabase/functions/_shared/appleIap.ts` を削除した。~~

## 制約事項 / 既知の課題

- Webhook は非同期のため、購入直後に DB が追いつかない瞬間がありうる。購入成功後は `SubscriptionContext.refresh()` で再取得する。
- Sandbox の期限が短い点は従来どおり E2E で考慮する。
- Android 対応時は同じ Webhook で `store = 'google'` を処理する想定。

---

**作成日**: 2026-04-26  
**更新日**: 2026-04-29  
**関連 migration**: `supabase/migrations/20260504_subscriptions_table.sql`
