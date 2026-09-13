-- ===========================================================
-- get_timeline_posts がフレンド投稿を空で返す問題の修正（2026-09-13）
--
-- ページネーション版は SECURITY INVOKER のまま reactions を LEFT JOIN していた。
-- reactions の RLS が外側の投稿行まで落とすと、RPC は成功したのに 0 件になる。
-- 記憶の再表示 RPC と同じく SECURITY DEFINER にし、自分のリアクションは
-- スカラー副問い合わせで取る。ブロック除外も NOT IN（NULL で全件消失）ではなく
-- NOT EXISTS にする。
--
-- 引数のデフォルトは維持する。引数なしの旧クライアントも、
-- p_limit / p_offset を付ける現行クライアントも同じ関数を呼ぶ。
-- ===========================================================

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
