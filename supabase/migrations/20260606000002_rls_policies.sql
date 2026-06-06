-- ===========================================================
-- DaiB RLS ポリシー（スカッシュ版 2026-06-06）
-- 全テーブルの最終状態ポリシーを一括定義
-- ===========================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_all_authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "categories_owner_all" ON public.categories;
CREATE POLICY "categories_owner_all"
  ON public.categories FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- posts
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "posts_owner_insert" ON public.posts;
CREATE POLICY "posts_owner_insert"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "posts_owner_update_delete" ON public.posts;
CREATE POLICY "posts_owner_update_delete"
  ON public.posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "posts_owner_delete" ON public.posts;
CREATE POLICY "posts_owner_delete"
  ON public.posts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- フレンドは visibility != 'private' の投稿のみ閲覧可
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
      )
    )
  );

-- ------------------------------------------------------------
-- post_categories
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "post_categories_owner_write" ON public.post_categories;
CREATE POLICY "post_categories_owner_write"
  ON public.post_categories FOR ALL TO authenticated
  USING (public.user_owns_post(post_id))
  WITH CHECK (public.user_owns_post(post_id));

DROP POLICY IF EXISTS "post_categories_select_friend_posts" ON public.post_categories;
CREATE POLICY "post_categories_select_friend_posts"
  ON public.post_categories FOR SELECT TO authenticated
  USING (
    public.invalidation_flag_is_active(invalidation_flag)
    AND EXISTS (
      SELECT 1 FROM public.posts r
      WHERE r.id = post_id
        AND public.invalidation_flag_is_active(r.invalidation_flag)
        AND (
          r.user_id = auth.uid()
          OR (
            public.is_friend(auth.uid(), r.user_id)
            AND r.visibility != 'private'
          )
        )
    )
  );

-- ------------------------------------------------------------
-- follows
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "follows_read_related" ON public.follows;
CREATE POLICY "follows_read_related"
  ON public.follows FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

-- 自分が送った申請（follower_id）は全操作可能
DROP POLICY IF EXISTS "follows_write_self"       ON public.follows;
DROP POLICY IF EXISTS "follows_write_as_follower" ON public.follows;
CREATE POLICY "follows_write_as_follower"
  ON public.follows FOR ALL TO authenticated
  USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());

-- 自分宛の申請（following_id）は approved のみ更新可能
DROP POLICY IF EXISTS "follows_approve_as_following" ON public.follows;
CREATE POLICY "follows_approve_as_following"
  ON public.follows FOR UPDATE TO authenticated
  USING (following_id = auth.uid()) WITH CHECK (following_id = auth.uid());

-- ------------------------------------------------------------
-- reactions
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "reactions_read_friend_visible_posts" ON public.reactions;
CREATE POLICY "reactions_read_friend_visible_posts"
  ON public.reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts r
      WHERE r.id = post_id
        AND public.invalidation_flag_is_active(r.invalidation_flag)
        AND (r.user_id = auth.uid() OR public.is_friend(auth.uid(), r.user_id))
    )
  );

DROP POLICY IF EXISTS "reactions_write_friend_visible_posts" ON public.reactions;
CREATE POLICY "reactions_write_friend_visible_posts"
  ON public.reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
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
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- reports（通報）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "reports: own select" ON public.reports;
CREATE POLICY "reports: own select"
  ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports: own insert" ON public.reports;
CREATE POLICY "reports: own insert"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- ------------------------------------------------------------
-- user_blocks（ブロック）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "user_blocks: own select" ON public.user_blocks;
CREATE POLICY "user_blocks: own select"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_blocks: own insert" ON public.user_blocks;
CREATE POLICY "user_blocks: own insert"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_blocks: own delete" ON public.user_blocks;
CREATE POLICY "user_blocks: own delete"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- contacts（お問い合わせ）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "contacts_insert_own" ON public.contacts;
CREATE POLICY "contacts_insert_own"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contacts_service_role_all" ON public.contacts;
CREATE POLICY "contacts_service_role_all"
  ON public.contacts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- subscriptions（IAP サブスクリプション）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- insert/update/delete はクライアントから不可。Edge Function (service_role) 経由のみ。
DROP POLICY IF EXISTS "subscriptions_service_role_all" ON public.subscriptions;
CREATE POLICY "subscriptions_service_role_all"
  ON public.subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- rate_limit_buckets（レート制限）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "rate_limit_service_role_all" ON public.rate_limit_buckets;
CREATE POLICY "rate_limit_service_role_all"
  ON public.rate_limit_buckets FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- in_app_notifications（アプリ内通知）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "in_app_notifications: own read" ON public.in_app_notifications;
CREATE POLICY "in_app_notifications: own read"
  ON public.in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "in_app_notifications: own update" ON public.in_app_notifications;
CREATE POLICY "in_app_notifications: own update"
  ON public.in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- notification_preferences（通知設定）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "notification_preferences: own read" ON public.notification_preferences;
CREATE POLICY "notification_preferences: own read"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences: own insert" ON public.notification_preferences;
CREATE POLICY "notification_preferences: own insert"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences: own update" ON public.notification_preferences;
CREATE POLICY "notification_preferences: own update"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- notifications_log（配信履歴 — 管理者のみ参照可）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_log: admin read" ON public.notifications_log;
CREATE POLICY "notifications_log: admin read"
  ON public.notifications_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
