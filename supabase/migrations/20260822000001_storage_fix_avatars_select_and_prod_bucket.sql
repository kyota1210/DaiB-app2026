-- ===========================================================
-- Storage 修正（2026-08-22）
-- 1. avatars の SELECT ポリシー欠落を復旧
-- 2. prod の投稿画像バケットを定義に追加
-- ===========================================================

-- ------------------------------------------------------------
-- avatars: SELECT ポリシーの復旧
-- INSERT ... RETURNING / ON CONFLICT DO UPDATE は SELECT ポリシーも
-- AND で評価されるため、これが無いとアップロード自体が RLS で失敗する。
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- ------------------------------------------------------------
-- daib-prod-post-images バケット
-- パス形式: {userId}/{postId}/{filename}
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('daib-prod-post-images', 'daib-prod-post-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "daib_prod_post_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "daib_prod_post_images_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "daib_prod_post_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "daib_prod_post_images_owner_delete" ON storage.objects;

CREATE POLICY "daib_prod_post_images_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'daib-prod-post-images');

CREATE POLICY "daib_prod_post_images_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'daib-prod-post-images'
    AND split_part(name, '/', 1) = (SELECT auth.uid()::text)
  );

CREATE POLICY "daib_prod_post_images_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'daib-prod-post-images' AND split_part(name, '/', 1) = (SELECT auth.uid()::text))
  WITH CHECK (bucket_id = 'daib-prod-post-images' AND split_part(name, '/', 1) = (SELECT auth.uid()::text));

CREATE POLICY "daib_prod_post_images_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'daib-prod-post-images' AND split_part(name, '/', 1) = (SELECT auth.uid()::text));
