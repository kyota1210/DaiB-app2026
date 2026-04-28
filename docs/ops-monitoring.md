# 運用監視・アラート整備ガイド

最終更新日: 2026-04-26

DaiB iOS 本番リリース後の運用監視・アラートに関する設定手順をまとめる。F2-4 で導入した Sentry と、Supabase のログ・メトリクスを起点に、最低限のアラート体制を構築する。

---

## 1. 監視レイヤー一覧

| レイヤー | ツール | 取得対象 |
|---|---|---|
| クライアント | Sentry (`@sentry/react-native`) | クラッシュ / JS エラー / Promise rejection |
| サーバー（Edge Functions） | Supabase Logs Explorer + Logflare/Better Stack | Function 実行ログ / エラー応答 |
| データベース | Supabase Dashboard / `pg_stat_statements` | スロークエリ / 接続数 / RLS 拒否 |
| 課金 | App Store Connect | サブスク売上 / リファンド / DAU / 失敗トランザクション |
| 広告 | AdMob Console | 広告リクエスト / 表示率 / RPM |
| 状態ページ（任意） | Better Stack Status / Instatus | ユーザー向け公開ステータス |

---

## 2. Sentry のアラート設定

### 2.1 環境別プロジェクト

`SENTRY_DSN_DEV` / `SENTRY_DSN_STAGING` / `SENTRY_DSN_PROD` を EAS Secrets に登録（`docs/eas-build-guide.md` 参照）。本実装は `client-app/utils/observability.js` で読み込み済み。

### 2.2 推奨アラートルール

Sentry Web → Project → Alerts → Create Alert。

| アラート名 | 条件 | 通知先 |
|---|---|---|
| Crash spike | `event.type:error AND level:fatal` が 5 分で 5 件超 | Slack #ops（重大） / メール |
| Auth failure surge | `tag:operation:auth AND level:error` が 10 分で 20 件超 | Slack #ops |
| IAP verify failure | `tag:operation:iap-verify AND level:error` が 5 分で 3 件超 | Slack #ops（重大） |
| First-seen issue | New issue (production) | Slack #ops |
| Release health | Crash-free sessions < 99.0% (24h) | メール（週次レビュー） |

### 2.3 リリースとソースマップ

EAS Build に `expo-cli` の Sentry プラグインを追加し、`SENTRY_AUTH_TOKEN` を EAS Secret に登録する。アップロード設定は `app.json` の `plugins` に `sentry-expo` を追加（要 F3-2 後続作業）。

---

## 3. Supabase ログ転送（Logflare / Better Stack）

Supabase は標準で 7 日間ログ保持。長期保管・全文検索のため外部 sink に転送する。

### 3.1 Better Stack Logs（推奨）

1. Better Stack → Sources → Add source → "HTTP" を作成、Source Token を控える。
2. Supabase Dashboard → Settings → Integrations → "Log Drains"（Pro プラン以上）を有効化。
3. Drain destination に Better Stack の HTTP endpoint を登録、ヘッダ `Authorization: Bearer <token>`。
4. Better Stack 側で以下のアラートを作成：
   - `severity = "error" AND service = "edge-function"` が 5 分で 10 件超 → Slack
   - `body matches "RLS|permission denied"` が 1 時間で 50 件超 → Slack
   - `metadata.function_id = "verify-iap-receipt" AND status = 500` が 10 分で 3 件超 → 重大

### 3.2 Logflare（代替）

Supabase 公式の Logflare 連携を使う場合は、Project Settings → Logflare → Connect。ダッシュボードで Source ごとに Saved Query を作り、Slack に Webhook 通知する。

### 3.3 Edge Function ログのフォーマット

`console.log` / `console.error` で出力すれば自動収集される。エラー時は `JSON.stringify` で構造化して出すと検索しやすい：

```typescript
console.error(JSON.stringify({ scope: 'verify-iap-receipt', step: 'apple-api', err: String(e), userId }));
```

既存 `supabase/functions/verify-iap-receipt/index.ts` などにも段階的に適用する（F3-2 後続）。

---

## 4. データベース監視

### 4.1 Supabase Dashboard

- Reports → Database → Connections / Slow queries を週次レビュー。
- `pg_stat_statements` で TOP10 を月次で確認、必要な index を追加する。

### 4.2 アラート（Better Stack Heartbeats などで擬似的に）

Supabase 自体には簡易アラートしかないため、`is_current_user_premium()` RPC やヘルスチェック RPC を 1 分おきに呼ぶ Heartbeat ジョブを Better Stack で設定して停止検知する。

```sql
-- supabase/migrations/2026XXXX_healthcheck.sql（任意）
create or replace function public.healthcheck() returns text language sql stable as $$ select 'ok' $$;
grant execute on function public.healthcheck() to anon, authenticated;
```

Heartbeat URL（cron）：

```
curl -sf "https://<ref>.supabase.co/rest/v1/rpc/healthcheck" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

---

## 5. App Store Connect / AdMob

### 5.1 App Store Connect

- App Analytics → 売上・サブスク状況を週次レビュー。
- App Store Server Notifications V2 の **DLQ（Dead Letter Queue）** が無いため、`apple-iap-webhook` 内のエラーログ（Sentry）でアラート化する。
- リファンド率 > 5% / カスタマーレビュー平均 < 3.5 でメール通知（手動レビュー）。

### 5.2 AdMob

- AdMob Console → アラート設定で「収益急減」「無効なトラフィック警告」を有効化。
- 月次で eCPM・表示率・クリック率をレビューし、配置（バナー / インタースティシャル頻度）を調整。

---

## 6. 状態ページ（任意・推奨）

公開ステータスページは信頼性向上のため早期に整備する。

- **Better Stack Status**（無料枠あり）または **Instatus**。
- コンポーネント: "アプリ", "API (Supabase)", "招待ページ (Cloudflare Pages)", "認証", "課金"。
- Heartbeat（§4.2）が 5 分以上失敗 → 自動で degraded、3 分以上 → 自動で down。
- メンテ予告は手動投稿。

---

## 7. オンコール / インシデント対応

最低限の運用ルール（個人運用でも明文化）：

| Severity | 例 | 一次対応目標 |
|---|---|---|
| SEV1 | アプリ起動不可 / 課金が全件失敗 / DB ダウン | 30 分以内 |
| SEV2 | 投稿不能 / 通報処理停止 / 広告 0 表示 | 4 時間以内 |
| SEV3 | 一部 UI 不具合 / 翻訳欠落 | 翌営業日 |

連絡先・運用窓口は `docs/operations-info.md` の「24 時間以内通報対応」運用と統合する。インシデント発生時は **状態ページの更新 → Sentry/ログでの原因特定 → ロールバック判断（EAS の Update Channel または App Store の Phased Release 一時停止）** の順。

---

## 8. 次アクション TODO

- [ ] Sentry プロジェクトを `daib-ios-prod` / `staging` / `dev` の 3 つで作成、DSN を EAS Secrets に登録
- [ ] `sentry-expo` プラグインを `app.json` に追加し、ソースマップを EAS Build からアップロード
- [ ] Supabase を Pro プランへ上げ、Log Drain を Better Stack に接続
- [ ] Heartbeat 用 `healthcheck()` RPC を migration として追加し、Better Stack で 1 分間隔監視
- [ ] 状態ページを Better Stack Status で立ち上げ、`AboutScreen` にリンクを追加
- [ ] Slack #ops チャンネルを作成し、Sentry / Better Stack の Webhook を接続
