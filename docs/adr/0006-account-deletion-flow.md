# ADR-0006: アプリ内アカウント削除フロー

## ステータス

承認済み（2026-04-26）

## コンテキスト

Apple App Store Review Guideline **5.1.1(v)** は、ユーザー登録を提供するアプリに対し、アプリ内からアカウント削除を実行できることを要求している。Supabase の `auth.users` を直接 RLS 経由で削除させることはできないため、サーバー側の Service Role 権限で `auth.admin.deleteUser` を呼ぶ必要がある。さらに、アプリは UGC（投稿・カテゴリ・通報・ブロック・サブスク行）を持つため、関連レコードも整合性を保ちながら削除する必要がある。

選択肢は次の 3 つだった。

1. **Supabase Edge Function で本人専用の削除エンドポイント**を提供する
2. **自前の Express バックエンド**から `auth.admin.deleteUser` を呼ぶ
3. **論理削除（soft delete）のみ**で `auth.users` は残す

## 決定事項

Edge Function `delete-account` を新設し、認証済みユーザーの JWT を検証 → Service Role で関連レコードを物理削除（または論理削除）→ `auth.admin.deleteUser` を呼ぶ。クライアントは `LoginInfoScreen` 末尾に "アカウントを削除" 導線を置き、確認ダイアログ + 二段階確認を経て呼び出す。

## 決定理由

1. **Apple Guideline 5.1.1(v) 必須**: アプリ内から完結するフローが要求されている。Web ページ誘導や問い合わせ経由は不可。
2. **Service Role の隔離**: クライアントに Service Role Key を露出できないため、サーバー処理が必須。
3. **既存方針との整合**: バックエンドは Edge Function に寄せる。Express を増やさない。
4. **GDPR / 改正個人情報保護法**: 「忘れられる権利」「保有個人データの利用停止・消去請求」に対応するため、物理削除 + ストレージのオブジェクト削除を行う。

## 考慮した代替案

### A. 論理削除のみ（auth.users は残す）

- メリット: 復活が容易、削除ミスでもロールバック可能。
- デメリット: 同一メアドの再登録ができない（auth.users の制約違反）。Apple 審査では物理削除レベルを要求される事例あり。
- 結論: 不採用。論理削除は採用しない。

### B. 自前 Express から実装

- メリット: Edge Function の冷起動レイテンシを回避。
- デメリット: 招待ホスト以外を Express に乗せない方針に逆行。Service Role Key の配布先が増える。
- 結論: 不採用。

## 実装詳細

### Edge Function 構成

`supabase/functions/delete-account/index.ts` の処理順：

1. リクエストの `Authorization: Bearer <user JWT>` を検証し、`userId` を確定
2. レート制限（1 時間 3 回）→ 超過時 429
3. **Storage 削除**: `posts` バケットの `<userId>/` 配下、`avatars` バケットの `<userId>/` 配下のオブジェクトを `list` + `remove`
4. **DB 削除（CASCADE で吸収できないテーブル）**:
   - `reactions`（`user_id`）
   - `reports`（`reporter_id` 起源のもの）
   - `user_blocks`（双方向）
   - `follows`（双方向）
   - `category_entities` / `categories` / `posts`
   - `subscriptions`
   - `profiles`
5. `supabase.auth.admin.deleteUser(userId)` で `auth.users` から本人を削除

### クライアント UI

- 画面: `LoginInfoScreen.js` 末尾に "アカウントを削除" セクション
- 確認: 2 段階の `Alert.alert`（「本当に削除しますか？」→「最終確認」）
- 削除後: `AuthContext.signOut()` → 未ログイン画面へ遷移
- エラーハンドリング: 部分失敗（Storage 削除失敗など）は警告ログのみで、`auth.users` 削除を優先する

### 関連レコード CASCADE 整理

| テーブル | CASCADE 設定 | 本 Function での明示削除 |
|---|---|---|
| `subscriptions` | `references auth.users(id) on delete cascade` | 念のため明示削除 |
| `profiles` | `references auth.users(id) on delete cascade` | 念のため明示削除 |
| `posts` / `categories` / `category_entities` | アプリレイヤで論理削除運用 | 物理削除（個人情報を残さない） |
| `reactions` / `reports` / `user_blocks` / `follows` | アプリレイヤ | 物理削除 |
| `contacts` | `on delete set null` | 残す（運用上の問い合わせ履歴を保持） |

### 通報レコードの残存

ユーザーが他人を通報した `reports` 行は、対応中のものは削除せず `reporter_id` を `null` に更新する選択肢もあった。本実装では、通報者プライバシーを優先して全削除している。Apple Guideline 1.2 で 24 時間以内対応が要求されているが、通報情報は別運用ログに転記済みである前提とする（運用フローはリリースチェックリスト `docs/release-checklist.md` の「通報対応」節を参照）。

## 制約事項 / 既知の課題

- `auth.users` 削除と関連レコード削除はトランザクションで一括ロールバックできない（Auth API は別系統）。途中で失敗した場合は `delete-account` を再実行することで idempotent に完走する設計とする。
- IAP の購読は Apple 側に残るため、ユーザー自身に App Store の "サブスクリプションを管理" から解約する旨を案内する（削除確認ダイアログに記載）。
- 削除後 30 日間はメタ情報（contact 等）を運用ログとして保持する旨を、プライバシーポリシーに記載済み。

---

**作成日**: 2026-04-26  
**作成者**: 開発チーム  
**関連 ADR**: ADR-0002（論理削除）、ADR-0004（IAP）  
**関連実装**: `supabase/functions/delete-account/index.ts`, `client-app/screens/LoginInfoScreen.js`
