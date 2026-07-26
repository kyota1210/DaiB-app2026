-- subscriptions テーブルに environment カラムを追加
-- RevenueCat の event.environment（SANDBOX / PRODUCTION）を記録する。
-- Sandbox データを集計から除外したり、TestFlight テスト購入を識別するために使用。

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS environment text
  CHECK (environment IN ('sandbox', 'production'));
