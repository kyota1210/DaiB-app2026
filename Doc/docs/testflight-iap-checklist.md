# Plusプランアップグレード テスト観点

サブスクリプション課金（RevenueCat + Supabase Webhook）の動作確認チェックリスト。

最終更新日: 2026-07-26

---

## 前提：Sandbox テスト環境の準備

- [ ] App Store Connect で Sandbox テスターアカウントを作成済み
- [ ] 実機の「設定 → App Store → Sandbox アカウント」でサインイン済み
- [ ] EAS development または preview ビルドを実機にインストール済み

---

## 1. 購入フロー（UI）


| #   | 観点                    | 期待結果                                             | 結果  |
| --- | --------------------- | ------------------------------------------------ | --- |
| 1-1 | 「Plusにアップグレード」ボタンをタップ | Apple 決済シートが表示される                                |     |
| 1-2 | 価格表示                  | RevenueCat から取得した価格（例: ¥250）が表示されている（ハードコードではない） |     |
| 1-3 | 決済シートでキャンセル           | エラーアラートが出ない・ローディングが止まる                           |     |
| 1-4 | Sandbox アカウントで購入確定    | ローディングインジケーターが表示され続ける（Webhook 待ち）                |     |
| 1-5 | Webhook 処理後（最大20秒）    | 画面が自動で「Plusプランアクティブ」に切り替わる                       |     |
| 1-6 | 購入成功後のボタン表示           | 「アップグレード」ボタンが消え「サブスクリプションを管理」に切り替わる              |     |
| 1-7 | 次回更新日の表示              | `expiresAt` が表示されている（Sandbox は数分後）               |     |


---

## 2. RevenueCat ダッシュボードへの反映

RevenueCat Dashboard → Customers → 該当 User ID（Supabase UUID）で確認。


| #   | 観点                                 | 期待結果                       | 結果  |
| --- | ---------------------------------- | -------------------------- | --- |
| 2-1 | Subscriber として登録されている              | Customers に該当ユーザーが存在する     |     |
| 2-2 | `INITIAL_PURCHASE` イベントが記録されている    | Customer 詳細 → Activity に表示 |     |
| 2-3 | Entitlement `premium` がアクティブになっている | Customer 詳細 → Entitlements |     |
| 2-4 | `environment: SANDBOX` と表示されている    | 本番データと混在していないことを確認         |     |


---

## 3. Supabase `subscriptions` テーブルへの反映（Webhook 経由）

Supabase Dashboard → SQL Editor で確認：

```sql
SELECT * FROM public.subscriptions WHERE user_id = '<テストユーザーのUUID>';
```


| #   | カラム                       | 期待値                 | 結果  |
| --- | ------------------------- | ------------------- | --- |
| 3-1 | `status`                  | `active`            |     |
| 3-2 | `store`                   | `apple`             |     |
| 3-3 | `product_id`              | `daib_plus_monthly` |     |
| 3-4 | `environment`             | `sandbox`           |     |
| 3-5 | `expires_at`              | 数分後の日時（Sandbox は短い） |     |
| 3-6 | `auto_renew`              | `true`              |     |
| 3-7 | `original_transaction_id` | 空でない                |     |
| 3-8 | `last_verified_at`        | 現在時刻に近い             |     |


---

## 4. Edge Function ログの確認

Supabase Dashboard → **Functions → revenuecat-webhook → Logs** で確認。


| #   | 観点               | 期待結果                         | 結果  |
| --- | ---------------- | ---------------------------- | --- |
| 4-1 | Webhook が届いている   | `POST 200 ok` のログが存在する       |     |
| 4-2 | イベントタイプが正しい      | `INITIAL_PURCHASE`           |     |
| 4-3 | 401 エラーが出ていない    | Authorization トークンが正しく一致している |     |
| 4-4 | upsert エラーが出ていない | `upsert_failed` のログがない       |     |


---

## 5. アプリ側の Plus プラン反映


| #   | 観点                        | 確認方法                                               | 結果  |
| --- | ------------------------- | -------------------------------------------------- | --- |
| 5-1 | `isPremium = true` になる    | PremiumPlanScreen でダイヤモンドアイコンと「Plusプランアクティブ」表示     |     |
| 5-2 | 月間投稿数の制限が解除される            | 30件を超えても投稿できる                                      |     |
| 5-3 | カスタムカテゴリが3件を超えて作れる        | 4件目のカスタムカテゴリが作成できる                                 |     |
| 5-4 | 「過去の振り返り」が全期間表示           | 1M/3M/6M/1Y/3Y/5Y の全ホライゾンが表示される                    |     |
| 5-5 | ログアウト→ログインしても Plus が維持される | 再起動後も `subscriptions` テーブルから読み込んで isPremium が true |     |


---

## 6. べき等性・重複配信


| #   | 観点                                  | 確認方法                                   | 結果  |
| --- | ----------------------------------- | -------------------------------------- | --- |
| 6-1 | RC の「Send test webhook」を同じイベントで2回送信 | `subscriptions` テーブルに重複行が生まれない（upsert） |     |
| 6-2 | `last_verified_at` が更新される           | 2回目の Webhook 後に値が新しくなっている              |     |


---

## 7. 購入復元（Restore）


| #   | 観点                                | 期待結果                                       | 結果  |
| --- | --------------------------------- | ------------------------------------------ | --- |
| 7-1 | アンインストール後の再インストールで「購入を復元」         | 同じ Sandbox アカウントで復元でき、isPremium が true になる |     |
| 7-2 | 復元後に `subscriptions` テーブルが更新されている | Webhook イベントが届いて upsert されている              |     |


---

## 8. タイムアウト・異常系


| #   | 観点                            | 確認方法                                                       | 結果  |
| --- | ----------------------------- | ---------------------------------------------------------- | --- |
| 8-1 | Webhook 遅延（20秒タイムアウト）シミュレーション | `refreshWithRetry` が false を返し「反映まで少し時間がかかる場合があります」アラートが出る |     |
| 8-2 | タイムアウト後にアプリ再起動                | `subscriptions` を再読込して Plus が反映される（購入自体は完了済み）              |     |


---

## テスト実施順序

```
① フリー状態の確認（制限が効いているか）
② Sandbox で購入
③ RC ダッシュボード確認（2〜3分以内）  → セクション2
④ Supabase subscriptions テーブル確認   → セクション3
⑤ Edge Function ログ確認               → セクション4
⑥ アプリの Plus 機能確認（制限解除）   → セクション5
⑦ ログアウト→ログインでも維持されるか  → 5-5
⑧ Restore テスト                       → セクション7
```

---

## 参考リンク

- [dev Supabase Functions ログ](https://supabase.com/dashboard/project/ejiydxdijwyoglbatzge/functions)
- [prod Supabase Functions ログ](https://supabase.com/dashboard/project/giknxvsaovkahsonqyqd/functions)
- [RevenueCat ダッシュボード](https://app.revenuecat.com)
- [ADR-0004: IAP RevenueCat 設計](adr/0004-iap-receipt-verification.md)

