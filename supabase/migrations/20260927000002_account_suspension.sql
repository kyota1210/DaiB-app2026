-- ===========================================================
-- アカウント停止（is_suspended）と運営モデレーション用 hardening
--
-- - profiles.is_suspended を追加（Dashboard から運営が更新）
-- - authenticated が is_suspended / is_admin を自力で変更できないようガード
-- - 停止中ユーザーの書き込みを RLS / Storage / 主要 RPC で拒否
-- - 停止中ユーザーの投稿をフレンドタイムラインから除外
-- ===========================================================

-- ------------------------------------------------------------
-- 1. カラム追加
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_is_suspended_idx
  ON public.profiles (id)
  WHERE is_suspended = true;

COMMENT ON COLUMN public.profiles.is_suspended IS
  '運営によるアカウント停止フラグ。true のとき書き込み系を RLS/RPC で拒否する。';

-- ------------------------------------------------------------
-- 2. モデレーション用フラグのクライアント変更防止
--    （既存 prevent_is_admin_change を拡張）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_is_admin_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'is_admin cannot be changed via the API';
    END IF;
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
      RAISE EXCEPTION 'is_suspended cannot be changed via the API';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 3. ヘルパー
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_current_user_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_suspended FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_suspended() FROM public;
GRANT EXECUTE ON FUNCTION public.is_current_user_suspended() TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_current_user_not_suspended()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'account_suspended'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_current_user_not_suspended() FROM public;
GRANT EXECUTE ON FUNCTION public.assert_current_user_not_suspended() TO authenticated;

-- ------------------------------------------------------------
-- 4. RLS: 書き込み系に停止チェックを追加
-- ------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND NOT public.is_current_user_suspended())
  WITH CHECK (id = auth.uid() AND NOT public.is_current_user_suspended());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND NOT public.is_current_user_suspended());

-- categories
DROP POLICY IF EXISTS "categories_owner_all" ON public.categories;
CREATE POLICY "categories_owner_all"
  ON public.categories FOR ALL TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_current_user_suspended())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_current_user_suspended());

-- posts
DROP POLICY IF EXISTS "posts_owner_insert" ON public.posts;
CREATE POLICY "posts_owner_insert"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_current_user_suspended());

DROP POLICY IF EXISTS "posts_owner_update_delete" ON public.posts;
CREATE POLICY "posts_owner_update_delete"
  ON public.posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_current_user_suspended())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_current_user_suspended());

DROP POLICY IF EXISTS "posts_owner_delete" ON public.posts;
CREATE POLICY "posts_owner_delete"
  ON public.posts FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_current_user_suspended());

-- フレンド閲覧: 停止中ユーザーの投稿は他者から見えない（本人は自分の投稿を閲覧可）
DROP POLICY IF EXISTS "posts_owner_or_friend_read" ON public.posts;
CREATE POLICY "posts_owner_or_friend_read"
  ON public.posts FOR SELECT TO authenticated
  USING (
    public.invalidation_flag_is_active(invalidation_flag)
    AND (
      user_id = auth.uid()
      OR (
        public.is_friend(auth.uid(), user_id)
        AND visibility != 'private'
        AND NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = posts.user_id AND p.is_suspended = true
        )
      )
    )
  );

-- post_categories
DROP POLICY IF EXISTS "post_categories_owner_write" ON public.post_categories;
CREATE POLICY "post_categories_owner_write"
  ON public.post_categories FOR ALL TO authenticated
  USING (public.user_owns_post(post_id) AND NOT public.is_current_user_suspended())
  WITH CHECK (public.user_owns_post(post_id) AND NOT public.is_current_user_suspended());

-- follows
DROP POLICY IF EXISTS "follows_write_as_follower" ON public.follows;
CREATE POLICY "follows_write_as_follower"
  ON public.follows FOR ALL TO authenticated
  USING (follower_id = auth.uid() AND NOT public.is_current_user_suspended())
  WITH CHECK (follower_id = auth.uid() AND NOT public.is_current_user_suspended());

DROP POLICY IF EXISTS "follows_approve_as_following" ON public.follows;
CREATE POLICY "follows_approve_as_following"
  ON public.follows FOR UPDATE TO authenticated
  USING (following_id = auth.uid() AND NOT public.is_current_user_suspended())
  WITH CHECK (following_id = auth.uid() AND NOT public.is_current_user_suspended());

-- reactions
DROP POLICY IF EXISTS "reactions_write_friend_visible_posts" ON public.reactions;
CREATE POLICY "reactions_write_friend_visible_posts"
  ON public.reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_current_user_suspended()
    AND EXISTS (
      SELECT 1 FROM public.posts r
      WHERE r.id = post_id
        AND public.invalidation_flag_is_active(r.invalidation_flag)
        AND public.is_friend(auth.uid(), r.user_id)
    )
  );

DROP POLICY IF EXISTS "reactions_update_own" ON public.reactions;
CREATE POLICY "reactions_update_own"
  ON public.reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_current_user_suspended())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_current_user_suspended());

-- user_blocks
DROP POLICY IF EXISTS "user_blocks: own insert" ON public.user_blocks;
CREATE POLICY "user_blocks: own insert"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_current_user_suspended());

DROP POLICY IF EXISTS "user_blocks: own delete" ON public.user_blocks;
CREATE POLICY "user_blocks: own delete"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_current_user_suspended());

-- contacts
DROP POLICY IF EXISTS "contacts_insert_own" ON public.contacts;
CREATE POLICY "contacts_insert_own"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_suspended());

-- notification_preferences
DROP POLICY IF EXISTS "notification_preferences: own insert" ON public.notification_preferences;
CREATE POLICY "notification_preferences: own insert"
  ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_suspended());

DROP POLICY IF EXISTS "notification_preferences: own update" ON public.notification_preferences;
CREATE POLICY "notification_preferences: own update"
  ON public.notification_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_current_user_suspended())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_suspended());

-- ------------------------------------------------------------
-- 5. Storage: 停止中はアップロード不可
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

CREATE POLICY "avatars_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
    AND NOT public.is_current_user_suspended()
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
    AND NOT public.is_current_user_suspended()
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
    AND NOT public.is_current_user_suspended()
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
    AND NOT public.is_current_user_suspended()
  );

DROP POLICY IF EXISTS "posts_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "posts_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "posts_owner_delete" ON storage.objects;

CREATE POLICY "posts_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT public.is_current_user_suspended()
  );

CREATE POLICY "posts_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT public.is_current_user_suspended()
  )
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT public.is_current_user_suspended()
  );

CREATE POLICY "posts_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT public.is_current_user_suspended()
  );

DROP POLICY IF EXISTS "daib_post_images_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "daib_post_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "daib_post_images_owner_delete" ON storage.objects;

CREATE POLICY "daib_post_images_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'daib-dev-post-images'
    AND split_part(name, '/', 1) = (SELECT auth.uid()::text)
    AND NOT public.is_current_user_suspended()
  );

CREATE POLICY "daib_post_images_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'daib-dev-post-images'
    AND split_part(name, '/', 1) = (SELECT auth.uid()::text)
    AND NOT public.is_current_user_suspended()
  )
  WITH CHECK (
    bucket_id = 'daib-dev-post-images'
    AND split_part(name, '/', 1) = (SELECT auth.uid()::text)
    AND NOT public.is_current_user_suspended()
  );

CREATE POLICY "daib_post_images_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'daib-dev-post-images'
    AND split_part(name, '/', 1) = (SELECT auth.uid()::text)
    AND NOT public.is_current_user_suspended()
  );

-- ------------------------------------------------------------
-- 6. 主要 RPC: 停止チェック / タイムラインから停止ユーザー除外
-- ------------------------------------------------------------

-- soft_delete_post
CREATE OR REPLACE FUNCTION public.soft_delete_post(p_post_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_affected integer;
BEGIN
  PERFORM public.assert_current_user_not_suspended();

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

-- accept_invite
CREATE OR REPLACE FUNCTION public.accept_invite(p_inviter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  PERFORM public.assert_current_user_not_suspended();
  IF p_inviter_id IS NULL OR p_inviter_id = v_me THEN
    RAISE EXCEPTION 'invalid inviter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_inviter_id) THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_inviter_id AND is_suspended = true
  ) THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (user_id = v_me AND blocked_user_id = p_inviter_id)
       OR (user_id = p_inviter_id AND blocked_user_id = v_me)
  ) THEN
    RAISE EXCEPTION 'blocked';
  END IF;

  INSERT INTO public.follows (follower_id, following_id, approved, invalidation_flag, deleted_at)
  VALUES (v_me, p_inviter_id, true, 0, NULL)
  ON CONFLICT (follower_id, following_id) DO UPDATE
    SET approved = true,
        invalidation_flag = 0,
        deleted_at = NULL;

  INSERT INTO public.follows (follower_id, following_id, approved, invalidation_flag, deleted_at)
  VALUES (p_inviter_id, v_me, true, 0, NULL)
  ON CONFLICT (follower_id, following_id) DO UPDATE
    SET approved = true,
        invalidation_flag = 0,
        deleted_at = NULL;

  RETURN jsonb_build_object(
    'following', true,
    'is_followed_by', true,
    'is_friend', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;

-- get_timeline_posts: 停止ユーザーの投稿を除外（最新シグネチャ）
DROP FUNCTION IF EXISTS public.get_timeline_posts();
DROP FUNCTION IF EXISTS public.get_timeline_posts(int, int);

CREATE OR REPLACE FUNCTION public.get_timeline_posts(
  p_limit  int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id                        bigint,
  author_id                 uuid,
  author_name               text,
  author_avatar_url         text,
  author_profile_updated_at timestamptz,
  title                     text,
  description               text,
  date_logged               date,
  image_url                 text,
  my_reaction               text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_friends AS (
    SELECT f.following_id AS friend_id
    FROM public.follows f
    JOIN public.follows f2
      ON f2.follower_id  = f.following_id
     AND f2.following_id = f.follower_id
     AND public.invalidation_flag_is_active(f2.invalidation_flag)
     AND f2.approved = true
    WHERE f.follower_id = auth.uid()
      AND public.invalidation_flag_is_active(f.invalidation_flag)
      AND f.approved = true
  ),
  blocked_ids AS (
    SELECT blocked_user_id AS blocked_id FROM public.user_blocks WHERE user_id = auth.uid()
    UNION
    SELECT user_id AS blocked_id FROM public.user_blocks WHERE blocked_user_id = auth.uid()
  )
  SELECT
    r.id,
    r.user_id           AS author_id,
    p.user_name         AS author_name,
    p.avatar_url        AS author_avatar_url,
    p.updated_at        AS author_profile_updated_at,
    r.title,
    r.description,
    r.date_logged::date,
    r.image_url,
    (
      SELECT react.emoji
      FROM public.reactions react
      WHERE react.post_id = r.id
        AND react.user_id = auth.uid()
      LIMIT 1
    ) AS my_reaction
  FROM public.posts r
  JOIN my_friends mf     ON mf.friend_id = r.user_id
  JOIN public.profiles p ON p.id = r.user_id
  WHERE public.invalidation_flag_is_active(r.invalidation_flag)
    AND r.visibility = 'public'
    AND r.date_logged::date >= current_date - INTERVAL '7 days'
    AND p.is_suspended = false
    AND NOT EXISTS (
      SELECT 1 FROM blocked_ids b WHERE b.blocked_id = r.user_id
    )
  ORDER BY r.date_logged::date DESC, r.id DESC
  LIMIT  GREATEST(COALESCE(p_limit, 30), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_timeline_posts(int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_timeline_posts(int, int) TO authenticated;

NOTIFY pgrst, 'reload schema';
