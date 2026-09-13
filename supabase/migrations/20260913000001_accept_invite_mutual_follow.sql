-- 招待を受けてフォローした時点で相互フォローにする。
-- 受け手は自分の follows 行しか書けないため、招待元→受け手の行は SECURITY DEFINER で作る。

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
  IF p_inviter_id IS NULL OR p_inviter_id = v_me THEN
    RAISE EXCEPTION 'invalid inviter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_inviter_id) THEN
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
