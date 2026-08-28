-- ===========================================================
-- DaiB RPC・ストアドプロシージャ（スカッシュ版 2026-06-06）
-- クライアントが呼ぶ全 RPC の最終定義
-- ===========================================================

-- ------------------------------------------------------------
-- is_current_user_premium
-- Plus プランの有効判定
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_current_user_premium()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.status IN ('active', 'in_grace_period', 'in_billing_retry')
      AND (s.expires_at IS NULL OR s.expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_user_premium() FROM public;
GRANT EXECUTE ON FUNCTION public.is_current_user_premium() TO authenticated;

-- ------------------------------------------------------------
-- ensure_my_profile
-- 初回ログイン時にプロフィール行を保証する（SECURITY DEFINER）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.profiles;
  uname  text;
BEGIN
  SELECT * INTO result FROM public.profiles WHERE id = auth.uid();
  IF found THEN
    RETURN result;
  END IF;

  SELECT COALESCE(
    NULLIF(trim(both FROM (raw_user_meta_data->>'user_name')), ''),
    NULLIF(trim(both FROM split_part(COALESCE(email, ''), '@', 1)), ''),
    'user'
  ) INTO uname
  FROM auth.users
  WHERE id = auth.uid();

  IF uname IS NULL OR length(trim(both FROM uname)) = 0 THEN
    uname := 'user';
  END IF;
  uname := left(uname, 25);

  INSERT INTO public.profiles (id, user_name)
  VALUES (auth.uid(), uname)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO result FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ensure_my_profile: could not read profile after insert';
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- ------------------------------------------------------------
-- get_timeline_posts
-- フレンドの直近7日間の投稿を返す
-- ・visibility = 'public' のみ表示
-- ・双方向ブロック関係のユーザーを除外
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_timeline_posts();

CREATE OR REPLACE FUNCTION public.get_timeline_posts()
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
LANGUAGE sql STABLE SECURITY INVOKER AS $$
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
    react.emoji         AS my_reaction
  FROM public.posts r
  JOIN my_friends mf    ON mf.friend_id = r.user_id
  JOIN public.profiles p ON p.id = r.user_id
  LEFT JOIN public.reactions react
    ON react.post_id = r.id AND react.user_id = auth.uid()
  WHERE public.invalidation_flag_is_active(r.invalidation_flag)
    AND r.visibility = 'public'
    AND r.date_logged::date >= current_date - INTERVAL '7 days'
    AND r.user_id NOT IN (SELECT blocked_id FROM blocked_ids)
  ORDER BY r.date_logged::date DESC, r.id DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_timeline_posts() TO authenticated;

-- ------------------------------------------------------------
-- get_thread_memory_resurface
-- スレッド「過去の投稿」再表示
-- フリー: 1年前の同日のみ / Plus: 1M/3M/6M/1Y/3Y/5Y 前の同日
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_thread_memory_resurface(
  p_client_tz text DEFAULT 'Asia/Tokyo'
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
  my_reaction               text,
  horizon                   text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz    text;
  v_today date;
  v_uid   uuid;
BEGIN
  v_tz := COALESCE(NULLIF(trim(p_client_tz), ''), 'Asia/Tokyo');
  BEGIN
    v_today := (now() AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN OTHERS THEN
    v_tz    := 'Asia/Tokyo';
    v_today := (now() AT TIME ZONE v_tz)::date;
  END;

  v_uid := auth.uid();

  IF public.is_current_user_premium() THEN
    -- Plus プラン: 直近から遠い順 (1M → 3M → 6M → 1Y → 3Y → 5Y)
    RETURN QUERY
      SELECT p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
             p.title::text, p.description, p.date_logged::date, p.image_url::text,
             react.emoji::text, '1M'::text
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      LEFT JOIN public.reactions react ON react.post_id = p.id AND react.user_id = v_uid
      WHERE p.user_id = v_uid
        AND public.invalidation_flag_is_active(p.invalidation_flag)
        AND p.date_logged::date = (v_today - INTERVAL '1 month')::date
      ORDER BY p.id DESC;

    RETURN QUERY
      SELECT p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
             p.title::text, p.description, p.date_logged::date, p.image_url::text,
             react.emoji::text, '3M'::text
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      LEFT JOIN public.reactions react ON react.post_id = p.id AND react.user_id = v_uid
      WHERE p.user_id = v_uid
        AND public.invalidation_flag_is_active(p.invalidation_flag)
        AND p.date_logged::date = (v_today - INTERVAL '3 months')::date
      ORDER BY p.id DESC;

    RETURN QUERY
      SELECT p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
             p.title::text, p.description, p.date_logged::date, p.image_url::text,
             react.emoji::text, '6M'::text
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      LEFT JOIN public.reactions react ON react.post_id = p.id AND react.user_id = v_uid
      WHERE p.user_id = v_uid
        AND public.invalidation_flag_is_active(p.invalidation_flag)
        AND p.date_logged::date = (v_today - INTERVAL '6 months')::date
      ORDER BY p.id DESC;

    RETURN QUERY
      SELECT p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
             p.title::text, p.description, p.date_logged::date, p.image_url::text,
             react.emoji::text, '1Y'::text
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      LEFT JOIN public.reactions react ON react.post_id = p.id AND react.user_id = v_uid
      WHERE p.user_id = v_uid
        AND public.invalidation_flag_is_active(p.invalidation_flag)
        AND p.date_logged::date = (v_today - INTERVAL '1 year')::date
      ORDER BY p.id DESC;

    RETURN QUERY
      SELECT p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
             p.title::text, p.description, p.date_logged::date, p.image_url::text,
             react.emoji::text, '3Y'::text
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      LEFT JOIN public.reactions react ON react.post_id = p.id AND react.user_id = v_uid
      WHERE p.user_id = v_uid
        AND public.invalidation_flag_is_active(p.invalidation_flag)
        AND p.date_logged::date = (v_today - INTERVAL '3 years')::date
      ORDER BY p.id DESC;

    RETURN QUERY
      SELECT p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
             p.title::text, p.description, p.date_logged::date, p.image_url::text,
             react.emoji::text, '5Y'::text
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      LEFT JOIN public.reactions react ON react.post_id = p.id AND react.user_id = v_uid
      WHERE p.user_id = v_uid
        AND public.invalidation_flag_is_active(p.invalidation_flag)
        AND p.date_logged::date = (v_today - INTERVAL '5 years')::date
      ORDER BY p.id DESC;

  ELSE
    -- フリープラン: 1年前のみ
    RETURN QUERY
      SELECT p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
             p.title::text, p.description, p.date_logged::date, p.image_url::text,
             react.emoji::text, '1Y'::text
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      LEFT JOIN public.reactions react ON react.post_id = p.id AND react.user_id = v_uid
      WHERE p.user_id = v_uid
        AND public.invalidation_flag_is_active(p.invalidation_flag)
        AND p.date_logged::date = (v_today - INTERVAL '1 year')::date
      ORDER BY p.id DESC;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_thread_memory_resurface(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_thread_memory_resurface(text) TO authenticated;

-- ------------------------------------------------------------
-- healthcheck
-- 外部監視ツール向けの軽量ヘルスチェック（anon でも実行可）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.healthcheck()
RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'ok'::text $$;
REVOKE ALL ON FUNCTION public.healthcheck() FROM public;
GRANT EXECUTE ON FUNCTION public.healthcheck() TO anon, authenticated;
COMMENT ON FUNCTION public.healthcheck() IS
  'Lightweight uptime probe used by external monitors (Better Stack, etc.). Always returns ''ok''.';

-- ------------------------------------------------------------
-- rate_limit_check
-- Edge Functions 用レート制限カウンター
-- 戻り値: (allowed boolean, current_count integer)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rate_limit_check(
  p_key            text,
  p_window_seconds integer,
  p_limit          integer
)
RETURNS TABLE (allowed boolean, current_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bucket_start timestamptz;
  v_count        integer;
BEGIN
  v_bucket_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limit_buckets AS rb (key, bucket_started_at, count, updated_at)
    VALUES (p_key, v_bucket_start, 1, now())
    ON CONFLICT (key, bucket_started_at)
    DO UPDATE SET count = rb.count + 1, updated_at = now()
    RETURNING count INTO v_count;

  RETURN QUERY SELECT (v_count <= p_limit) AS allowed, v_count AS current_count;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_check(text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, integer, integer) TO service_role;

-- ------------------------------------------------------------
-- rate_limit_cleanup
-- 古いレート制限バケットの掃除（手動 or cron）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rate_limit_cleanup(p_keep_seconds integer DEFAULT 86400)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limit_buckets
  WHERE updated_at < now() - make_interval(secs => p_keep_seconds);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_cleanup(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.rate_limit_cleanup(integer) TO service_role;

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
