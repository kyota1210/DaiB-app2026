-- ===========================================================
-- soft_delete_post の適用漏れ復旧（2026-08-28）
-- 20260606000004_rpcs.sql へ後から追記したため、既に適用済みの
-- 本番環境には反映されていなかった。冪等な CREATE OR REPLACE で
-- 改めて定義する。
-- ===========================================================

-- ------------------------------------------------------------
-- soft_delete_post
-- 投稿のソフトデリート（SECURITY DEFINER でRLS WITH CHECK を回避）
-- 所有者チェックは関数内で明示的に行う
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_post(p_post_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_affected integer;
BEGIN
  UPDATE public.posts
  SET invalidation_flag = 1,
      deleted_at        = now()
  WHERE id              = p_post_id
    AND user_id         = auth.uid()
    AND invalidation_flag = 0;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  IF v_affected = 0 THEN
    RAISE EXCEPTION 'post not found or permission denied'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.soft_delete_post(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.soft_delete_post(bigint) TO authenticated;

-- PostgREST のスキーマキャッシュを再読み込み
NOTIFY pgrst, 'reload schema';
