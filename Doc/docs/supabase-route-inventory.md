# server-api ルート移行インベントリ

## 分類ルール
- `Supabase直結`: Expo から `supabase-js` を直接呼び出す
- `DB/RPC`: Postgres 関数・ビュー・制約で実装する
- `Edge Function`: 秘密情報/公開リンク中継などサーバー実行が必要
- `廃止`: Supabase Auth/Storage に吸収

## ルート別マッピング

| 現行ルート | 用途 | 移行先 |
| --- | --- | --- |
| `POST /api/auth/signup` | サインアップ | 廃止（Supabase Auth） |
| `POST /api/auth/login` | ログイン | 廃止（Supabase Auth） |
| `POST /api/auth/forgot-password` | パスワード再発行 | 廃止（Supabase Auth `resetPasswordForEmail`） |
| `POST /api/auth/reset-password` | パスワード更新 | 廃止（Supabase Auth `updateUser`） |
| `GET /api/auth/me` | 自分のユーザー情報 | Supabase直結（`profiles` + follows 集計） |
| `GET /api/categories` | カテゴリー一覧 | Supabase直結 |
| `POST /api/categories` | カテゴリー作成 | Supabase直結 |
| `PUT /api/categories/reorder` | カテゴリー並び替え | Supabase直結（バッチ更新） |
| `PUT /api/categories/:id` | カテゴリー更新 | Supabase直結 |
| `DELETE /api/categories/:id` | カテゴリー削除 | Supabase直結（論理削除） |
| `POST /api/records` | 記録作成 + 画像 | Supabase直結（DB + Storage） |
| `GET /api/records` | 自分の記録一覧 | Supabase直結 |
| `GET /api/records/:id` | 自分の記録詳細 | Supabase直結 |
| `PUT /api/records/:id` | 記録更新 + 画像 | Supabase直結（DB + Storage） |
| `DELETE /api/records/:id` | 記録削除 | Supabase直結（論理削除） |
| `GET /api/users/me` | 自プロフィール + counts | Supabase直結 + DB/RPC |
| `PUT /api/users/profile` | プロフィール更新 + アバター | Supabase直結（DB + Storage） |
| `PUT /api/users/me/settings` | 表示設定更新 | Supabase直結 |
| `GET /api/users/me/following` | フォロー中一覧 | Supabase直結 |
| `GET /api/users/me/followers` | フォロワー一覧 | Supabase直結 |
| `GET /api/users/me/friends` | 友だち一覧 | Supabase直結 |
| `GET /api/users/:id` | 他ユーザープロフィール | Supabase直結 |
| `GET /api/users/:id/records` | 他ユーザー記録（友だち制約） | DB/RLS |
| `POST /api/follows` | フォロー | Supabase直結 |
| `DELETE /api/follows/:following_id` | フォロー解除 | Supabase直結 |
| `DELETE /api/follows/incoming/:follower_id` | 申請拒否 | Supabase直結 |
| `GET /api/threads/timeline` | タイムライン + 再浮上 | DB/RPC |
| `POST /api/reactions` | リアクション追加/更新 | Supabase直結 |
| `GET /api/reactions/:recordId` | リアクション集計 | Supabase直結 |
| `GET /api/reactions/:recordId/details` | リアクション詳細 | DB/RLS + Supabase直結 |
| `GET /invite/:userId` | 招待リンク中継HTML | Edge Function |

## 備考
- 認証・セッションは `supabase.auth` を正本に統一する。
- 画像URLは Storage の公開URL/署名URLを DB に保持し、`uploads/` の相対パス運用を終了する。
- `server-api` は切替完了後に 410 を返す縮退モードへ移行する。
