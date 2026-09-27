-- 通報受付の hardening:
-- 1. 同一ユーザーによる同一対象への重複通報を防止
-- 2. クライアント直 INSERT を禁止し、Edge Function (service_role) 経由に限定

-- 既存の重複行があれば最新以外を削除してから UNIQUE を張る
DELETE FROM public.reports a
USING public.reports b
WHERE a.id > b.id
  AND a.reporter_id = b.reporter_id
  AND a.target_type = b.target_type
  AND a.target_id = b.target_id;

CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_target_unique
  ON public.reports (reporter_id, target_type, target_id);

DROP POLICY IF EXISTS "reports: own insert" ON public.reports;

REVOKE INSERT ON public.reports FROM authenticated;
-- SELECT は自分の通報確認用に残す（既存 "reports: own select" ポリシー）
GRANT SELECT ON public.reports TO authenticated;
