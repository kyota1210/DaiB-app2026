# セキュリティ: レート制限 / 画像モデレーション

最終更新日: 2026-09-27

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
| `submit-report` | `submit-report:<userId>` | 10 分 | 5 |
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

Google Cloud Vision API の SafeSearch を使用。Edge Secrets の **`GOOGLE_CLOUD_VISION_API_KEY`** で有効化。未設定なら判定をスキップ（== allow）し、アプリは止めない。

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
supabase secrets set GOOGLE_CLOUD_VISION_API_KEY=xxxxxxx --project-ref <ref>
```

未設定時は安全側（allow）に倒れるが、本番は必ず `GOOGLE_CLOUD_VISION_API_KEY` を設定する。

---

## 3. 通報（`submit-report`）

### 3.1 構成

- Edge Function: `supabase/functions/submit-report/index.ts`
- クライアント API: `client-app/api/moderation.js` の `createReport`
- DB: `public.reports`（INSERT は service_role のみ。authenticated は SELECT のみ）

### 3.2 挙動

1. JWT 認証必須
2. `target_type` / `reason` のホワイトリスト検証
3. レート制限（10 分 / 5 件）
4. `reports` へ `status='open'` で INSERT（同一 reporter+target は UNIQUE で 409）
5. Resend で `support@daibapp.com` へメール通知（失敗しても受付自体は成功）

通報された側への自動 BAN / 非表示は行わない。運用者がメールを受け取り、以下の Dashboard フローで対応する（原則 24 時間以内に初動）。

### 3.3 運営対応フロー（当面: Supabase Dashboard）

1. **メール確認**  
   `support@daibapp.com` の通報メールで `Report ID` / 通報者 / 投稿者 / 投稿 ID / 理由を確認する。

2. **reports を開く**（Table Editor → `reports`）  
   `id = Report ID` の行を探し、内容を照合する。

3. **対象投稿の対応**（いずれか）  
   - **論理削除**: `posts` で対象行の `invalidation_flag = 1`、`deleted_at = now()`  
   - **非公開**: `visibility = 'private'`（フレンドからも見えなくなる）

4. **reports.status を更新**  
   - 対応した場合: `status = 'actioned'`、`reviewed_at = now()`  
   - 問題なしと判断: `status = 'dismissed'`、`reviewed_at = now()`  
   - 調査中: `status = 'reviewing'`

5. **悪質な場合はアカウント停止**  
   `profiles` で対象ユーザーの `is_suspended = true` にする。  
   - 書き込み（投稿・フォロー・リアクション・Storage 等）は RLS で拒否される  
   - 停止中ユーザーの投稿はフレンドタイムラインから除外される  
   - アプリはプロフィール取得時に検知して強制ログアウトする  
   - `is_suspended` / `is_admin` はクライアント API から変更不可（Dashboard / service_role のみ）

解除時は `is_suspended = false` に戻す。

### 3.4 シークレット

| 変数 | 用途 |
|---|---|
| `RESEND_API_KEY` | Resend API（`submit-contact` と共用） |
| `CONTACT_FROM_EMAIL` または `REPORT_FROM_EMAIL` | 送信元（Resend 検証済みドメイン） |

通知先メールはコード上 `support@daibapp.com` 固定。

---

## 4. アカウント停止（`profiles.is_suspended`）

migration: `20260927000002_account_suspension.sql`

| 要素 | 内容 |
|---|---|
| カラム | `profiles.is_suspended boolean NOT NULL DEFAULT false` |
| 変更ガード | `prevent_is_admin_change` が `is_suspended` もブロック |
| ヘルパー | `is_current_user_suspended()` / `assert_current_user_not_suspended()` |
| RLS | 投稿・カテゴリ・フォロー・リアクション・ブロック・問い合わせ等の書き込みを拒否 |
| Storage | avatars / posts / daib-dev-post-images の書き込みを拒否 |
| RPC | `soft_delete_post` / `accept_invite` で停止チェック。`get_timeline_posts` は停止ユーザーの投稿を除外 |

---

## 5. テストチェックリスト

- [ ] `submit-contact` を 5 分内に 4 回叩く → 4 回目が 429
- [ ] `submit-report` を 10 分内に 6 回叩く → 6 回目が 429
- [ ] 同一 `(reporter, target_type, target_id)` を再通報 → 409 `already_reported`
- [ ] `delete-account` を立て続けに呼ぶ → 4 回目が 429
- [ ] （廃止）旧 `verify-iap-receipt` のユーザー単位レート制限は削除済み。Webhook はシークレット検証のみ。
- [ ] `moderate-image` に他人の `<userId>/` パスを渡す → 403
- [ ] `GOOGLE_CLOUD_VISION_API_KEY` 未設定時、投稿が問題なく作成できる
- [ ] `GOOGLE_CLOUD_VISION_API_KEY` 設定 + NSFW テスト画像で `block` 判定 → 投稿失敗 + ストレージから削除されている
- [ ] `profiles.is_suspended = true` にしたユーザーでログイン → `account_suspended` で拒否される
- [ ] 停止中ユーザーが投稿 INSERT を試みる → RLS で拒否される
- [ ] 停止中ユーザーの投稿がフレンドの `get_timeline_posts` に出ない
