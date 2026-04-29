# セキュリティ: レート制限 / 画像モデレーション

最終更新日: 2026-04-26

F3-3 で導入した、Edge Function のレート制限と画像モデレーション（NSFW 検出）の構成。

---

## 1. レート制限

### 1.1 全体構造

- DB テーブル: `public.rate_limit_buckets`（migration `20260506_rate_limit_table.sql`）
- RPC: `public.rate_limit_check(p_key text, p_window_seconds int, p_limit int)`
  - 現在のバケット（window_seconds 単位の固定タイムウィンドウ）にカウントを atomic increment
  - 戻り値: `(allowed boolean, current_count integer)`
- 共有ヘルパー: `supabase/functions/_shared/rateLimit.ts`
  - `isRateLimited(admin, key, windowSeconds, limit)` → 超過時 `true`

### 1.2 各 Edge Function の制限

| Function | キー | 窓 | 上限 |
|---|---|---|---|
| `submit-contact` | `submit-contact:<userId>` | 5 分 | 3 |
| `delete-account` | `delete-account:<userId>` | 1 時間 | 3 |
| `moderate-image` | `moderate-image:<userId>` | 60 秒 | 30 |

`revenuecat-webhook`（RevenueCat → Supabase）には **ユーザー JWT がなく**、**Authorization シークレット** のみで認証する。**レート制限は付けない**（RevenueCat 側の再送を阻害しない）。

### 1.3 バケット掃除

`public.rate_limit_cleanup(p_keep_seconds)` を週次 cron（Supabase Scheduled Functions または外部 cron）で呼ぶ。例:

```sql
select public.rate_limit_cleanup(86400 * 7); -- 7 日より古い行を削除
```

### 1.4 拡張案

- IP ベース制限が必要な場合は、Edge Function 側で `req.headers.get('cf-connecting-ip')` をキーに含める。
- 高負荷になったら Upstash Redis ベースに置き換え（`@upstash/ratelimit`）。

---

## 2. 画像モデレーション

### 2.1 構成

- Edge Function: `supabase/functions/moderate-image/index.ts`
- クライアント API: `client-app/api/moderation_image.js`
- 投稿フロー統合: `client-app/api/supabaseData.js` の `createRecord` / `updateRecord` / `updateProfile`

### 2.2 判定エンジン

Google Cloud Vision API の SafeSearch を使用。`VISION_API_KEY` 環境変数（Supabase Edge Secrets）で有効化。未設定時は判定をスキップ（== allow）し、アプリは止めない。

### 2.3 判定基準

Likelihood: `UNKNOWN(0) / VERY_UNLIKELY(1) / UNLIKELY(2) / POSSIBLE(3) / LIKELY(4) / VERY_LIKELY(5)`

| 結果 | 条件 |
|---|---|
| `block` | adult >= LIKELY OR violence >= LIKELY OR racy >= VERY_LIKELY |
| `review` | 上記未満かつ、いずれかが POSSIBLE 以上 |
| `allow` | 上記以外 |

`block` の場合、クライアント側でアップロード済みの Storage オブジェクトと posts 行を巻き戻し、ユーザーへ「利用規約違反の可能性」エラーを表示する。

### 2.4 セキュリティ

- 認証必須（user JWT）。
- `path` は本人の `<userId>/` 配下に限定（他人の画像を SafeSearch にかける攻撃を防ぐ）。
- bucket は `posts` / `avatars` のみ許可。

### 2.5 運用

- `review` 判定は現状ログのみ。将来的に管理者ダッシュボードで人手レビューする場合、`reports` テーブルに自動投入する仕組みを追加予定。
- Vision API のクォータ / 課金監視を Cloud Console のアラートで設定する。
- 代替: AWS Rekognition `DetectModerationLabels` に切り替え可能。`callVisionSafeSearch` を差し替えるのみ。

### 2.6 Edge Function のシークレット

```
supabase secrets set VISION_API_KEY=xxxx --project-ref <ref>
```

未設定時は安全側（allow）に倒れるが、本番は必ず設定する。

---

## 3. テストチェックリスト

- [ ] `submit-contact` を 5 分内に 4 回叩く → 4 回目が 429
- [ ] `delete-account` を立て続けに呼ぶ → 4 回目が 429
- [ ] （廃止）旧 `verify-iap-receipt` のユーザー単位レート制限は削除済み。Webhook はシークレット検証のみ。
- [ ] `moderate-image` に他人の `<userId>/` パスを渡す → 403
- [ ] `VISION_API_KEY` 未設定時、投稿が問題なく作成できる
- [ ] `VISION_API_KEY` 設定 + NSFW テスト画像で `block` 判定 → 投稿失敗 + ストレージから削除されている
