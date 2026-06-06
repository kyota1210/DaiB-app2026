-- ===========================================================
-- DaiB Storage（スカッシュ版 2026-06-06）
-- バケット定義と RLS ポリシー最終状態
-- ===========================================================

-- ------------------------------------------------------------
-- バケット
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars',               'avatars',               true),
  ('posts',                 'posts',                 true),
  ('daib-dev-post-images',  'daib-dev-post-images',  true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ------------------------------------------------------------
-- avatars バケット
-- パス形式: {userId}/{filename}
-- storage.foldername() ではなく name LIKE で判定（環境依存を回避）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'))
  WITH CHECK (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'));

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'));

-- ------------------------------------------------------------
-- posts バケット
-- パス形式: {userId}/{filename}
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "posts_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "posts_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "posts_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "posts_owner_delete" ON storage.objects;

CREATE POLICY "posts_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'posts');

CREATE POLICY "posts_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "posts_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "posts_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- daib-dev-post-images バケット
-- パス形式: {userId}/{postId}/{filename}
-- split_part で先頭ディレクトリ = auth.uid() を確認
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "daib_post_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "daib_post_images_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "daib_post_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "daib_post_images_owner_delete" ON storage.objects;

CREATE POLICY "daib_post_images_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'daib-dev-post-images');

CREATE POLICY "daib_post_images_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'daib-dev-post-images'
    AND split_part(name, '/', 1) = (SELECT auth.uid()::text)
  );

CREATE POLICY "daib_post_images_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'daib-dev-post-images' AND split_part(name, '/', 1) = (SELECT auth.uid()::text))
  WITH CHECK (bucket_id = 'daib-dev-post-images' AND split_part(name, '/', 1) = (SELECT auth.uid()::text));

CREATE POLICY "daib_post_images_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'daib-dev-post-images' AND split_part(name, '/', 1) = (SELECT auth.uid()::text));
