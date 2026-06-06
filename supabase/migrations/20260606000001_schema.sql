-- ===========================================================
-- DaiB スキーマ基盤（スカッシュ版 2026-06-06）
-- 拡張・ヘルパー関数・全テーブル・インデックス・トリガー・テーブル権限
-- ===========================================================

-- ------------------------------------------------------------
-- 拡張
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- ヘルパー: invalidation_flag が任意の型でも動作
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidation_flag_is_active(flag boolean)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT coalesce(flag, false) = false;
$$;

CREATE OR REPLACE FUNCTION public.invalidation_flag_is_active(flag smallint)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT coalesce(flag, 0::smallint) = 0::smallint;
$$;

CREATE OR REPLACE FUNCTION public.invalidation_flag_is_active(flag integer)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT coalesce(flag, 0) = 0;
$$;

-- ------------------------------------------------------------
-- ヘルパー: updated_at 自動更新トリガ関数
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- ヘルパー: フレンド判定（双方向 approved フォロー）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_friend(user_a uuid, user_b uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows f1
    JOIN public.follows f2
      ON f1.follower_id = f2.following_id
     AND f1.following_id = f2.follower_id
    WHERE f1.follower_id  = user_a
      AND f1.following_id = user_b
      AND public.invalidation_flag_is_active(f1.invalidation_flag)
      AND public.invalidation_flag_is_active(f2.invalidation_flag)
      AND f1.approved = true
      AND f2.approved = true
  );
$$;

-- ------------------------------------------------------------
-- ヘルパー: 投稿所有者確認（post_categories RLS 用）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_owns_post(p_post_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = p_post_id AND p.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.user_owns_post(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.user_owns_post(bigint) TO authenticated;

-- ------------------------------------------------------------
-- ヘルパー: 投稿閲覧権限確認（post_categories SELECT RLS 用）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_post_for_post_categories(p_post_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts r
    WHERE r.id = p_post_id
      AND public.invalidation_flag_is_active(r.invalidation_flag)
      AND (
        r.user_id = auth.uid()
        OR public.is_friend(auth.uid(), r.user_id)
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_post_for_post_categories(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.can_view_post_for_post_categories(bigint) TO authenticated;

-- ------------------------------------------------------------
-- ヘルパー: subscriptions updated_at トリガ関数
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.subscriptions_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- ヘルパー: is_admin 変更ガード（authenticated/anon からの変更を阻止）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_is_admin_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'is_admin cannot be changed via the API';
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- スキーマ利用権限
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

-- ===========================================================
-- テーブル定義
-- ===========================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name          text        NOT NULL CHECK (char_length(user_name) <= 25),
  avatar_url         text,
  default_view_mode  text        NOT NULL DEFAULT 'grid',
  default_sort_order text        NOT NULL DEFAULT 'date_logged',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  is_admin           boolean     NOT NULL DEFAULT false
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prevent_is_admin_change ON public.profiles;
CREATE TRIGGER trg_prevent_is_admin_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_is_admin_change();

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name     text        NOT NULL CHECK (char_length(category_name) <= 25),
  sort_order        integer     NOT NULL DEFAULT 0,
  invalidation_flag boolean     NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ユーザー内でのカテゴリー名ユニーク制約（アクティブなもの）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'categories'
      AND indexname  = 'categories_user_name_unique_active'
  ) THEN
    CREATE UNIQUE INDEX categories_user_name_unique_active
      ON public.categories(user_id, lower(category_name))
      WHERE public.invalidation_flag_is_active(invalidation_flag);
  END IF;
END $$;

DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ------------------------------------------------------------
-- posts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text        NOT NULL DEFAULT '',
  description       text        NOT NULL DEFAULT '',
  date_logged       date        NOT NULL,
  image_url         text,
  show_in_timeline  boolean     NOT NULL DEFAULT true,
  invalidation_flag boolean     NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  visibility        text        NOT NULL DEFAULT 'public'
                                CHECK (visibility IN ('public', 'friends', 'private'))
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS posts_user_date_idx
  ON public.posts(user_id, date_logged DESC)
  WHERE public.invalidation_flag_is_active(invalidation_flag);

DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ------------------------------------------------------------
-- post_categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_categories (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id           bigint      NOT NULL REFERENCES public.posts(id)      ON DELETE CASCADE,
  category_id       bigint      NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  invalidation_flag boolean     NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, category_id)
);

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS post_categories_set_updated_at ON public.post_categories;
CREATE TRIGGER post_categories_set_updated_at
  BEFORE UPDATE ON public.post_categories
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ------------------------------------------------------------
-- follows
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  follower_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invalidation_flag boolean     NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  approved          boolean     NOT NULL DEFAULT false,
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.follows TO authenticated;

CREATE INDEX IF NOT EXISTS follows_following_idx
  ON public.follows(following_id)
  WHERE public.invalidation_flag_is_active(invalidation_flag);

DROP TRIGGER IF EXISTS follows_set_updated_at ON public.follows;
CREATE TRIGGER follows_set_updated_at
  BEFORE UPDATE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ------------------------------------------------------------
-- reactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    bigint      NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  emoji      text        NOT NULL CHECK (emoji IN ('❤️', '👍', '🌸', '🎉', '✨')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reactions TO authenticated;

DROP TRIGGER IF EXISTS reactions_set_updated_at ON public.reactions;
CREATE TRIGGER reactions_set_updated_at
  BEFORE UPDATE ON public.reactions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ------------------------------------------------------------
-- reports（通報）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id          bigserial   PRIMARY KEY,
  reporter_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text        NOT NULL CHECK (target_type IN ('post', 'user', 'comment')),
  target_id   text        NOT NULL,
  reason      text        NOT NULL,
  detail      text,
  status      text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.reports TO authenticated;

CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_target_idx   ON public.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS reports_status_idx   ON public.reports(status) WHERE status = 'open';

-- ------------------------------------------------------------
-- user_blocks（ブロック）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_user_id),
  CHECK (user_id <> blocked_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;

CREATE INDEX IF NOT EXISTS user_blocks_user_idx    ON public.user_blocks(user_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks(blocked_user_id);

-- ------------------------------------------------------------
-- contacts（お問い合わせ）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  name       text        NOT NULL CHECK (length(trim(name))    BETWEEN 1 AND 100),
  email      text        NOT NULL CHECK (length(trim(email))   BETWEEN 3 AND 320),
  subject    text        NOT NULL CHECK (length(trim(subject)) BETWEEN 1 AND 200),
  message    text        NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 4000),
  status     text        NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new', 'triaged', 'responded', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS contacts_user_id_idx           ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS contacts_status_created_at_idx ON public.contacts(status, created_at DESC);

-- ------------------------------------------------------------
-- subscriptions（IAP サブスクリプション）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                 uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  store                   text        NOT NULL CHECK (store IN ('apple', 'google')),
  product_id              text        NOT NULL,
  original_transaction_id text        NOT NULL,
  latest_transaction_id   text,
  status                  text        NOT NULL CHECK (status IN (
                            'active', 'expired', 'in_grace_period', 'in_billing_retry',
                            'revoked', 'refunded', 'paused', 'unknown'
                          )),
  auto_renew              boolean,
  expires_at              timestamptz,
  last_verified_at        timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS subscriptions_status_idx    ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_expires_at_idx ON public.subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS subscriptions_orig_tx_idx   ON public.subscriptions(original_transaction_id);

DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.subscriptions_set_updated_at();

-- ------------------------------------------------------------
-- rate_limit_buckets（Edge Functions 用レート制限）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key               text        NOT NULL,
  bucket_started_at timestamptz NOT NULL,
  count             integer     NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, bucket_started_at)
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS rate_limit_buckets_updated_at_idx
  ON public.rate_limit_buckets(updated_at);

COMMENT ON TABLE public.rate_limit_buckets IS
  'Edge Functions 用の汎用レート制限カウンター。service_role からのみ書き換え可能。';

-- ------------------------------------------------------------
-- in_app_notifications（アプリ内通知）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id         uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('system', 'security')),
  title      text        NOT NULL,
  body       text        NOT NULL,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id
  ON public.in_app_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread
  ON public.in_app_notifications(user_id, is_read)
  WHERE is_read = false;

-- ------------------------------------------------------------
-- notification_preferences（通知設定）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                     bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  security_email_enabled boolean     NOT NULL DEFAULT true,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- notifications_log（配信履歴）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id      uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  type    text        NOT NULL CHECK (type IN ('system', 'security')),
  title   text        NOT NULL,
  body    text        NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by text
);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- ===========================================================
-- 既存 DB 向け: id PK 追加・post_categories 新カラム追加（idempotent）
-- CREATE TABLE IF NOT EXISTS は新規 DB にのみ適用される。
-- 既に存在するテーブルに対しては以下の ALTER TABLE で追従する。
-- ===========================================================

-- ------------------------------------------------------------
-- post_categories: id PK + invalidation_flag / deleted_at / updated_at
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'post_categories' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.post_categories ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
    ALTER TABLE public.post_categories DROP CONSTRAINT IF EXISTS post_categories_pkey;
    ALTER TABLE public.post_categories ADD PRIMARY KEY (id);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.post_categories'::regclass
        AND contype = 'u'
        AND conname = 'post_categories_post_id_category_id_key'
    ) THEN
      ALTER TABLE public.post_categories
        ADD CONSTRAINT post_categories_post_id_category_id_key UNIQUE (post_id, category_id);
    END IF;
  END IF;
END $$;

ALTER TABLE public.post_categories ADD COLUMN IF NOT EXISTS invalidation_flag boolean NOT NULL DEFAULT false;
ALTER TABLE public.post_categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.post_categories ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ------------------------------------------------------------
-- follows: id PK + (follower_id, following_id) を UNIQUE へ
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.follows ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
    ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_pkey;
    ALTER TABLE public.follows ADD PRIMARY KEY (id);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.follows'::regclass
        AND contype = 'u'
        AND conname = 'follows_follower_id_following_id_key'
    ) THEN
      ALTER TABLE public.follows
        ADD CONSTRAINT follows_follower_id_following_id_key UNIQUE (follower_id, following_id);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- reactions: id PK + (post_id, user_id) を UNIQUE へ
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reactions' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.reactions ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
    ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_pkey;
    ALTER TABLE public.reactions ADD PRIMARY KEY (id);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.reactions'::regclass
        AND contype = 'u'
        AND conname = 'reactions_post_id_user_id_key'
    ) THEN
      ALTER TABLE public.reactions
        ADD CONSTRAINT reactions_post_id_user_id_key UNIQUE (post_id, user_id);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- user_blocks: id PK + (user_id, blocked_user_id) を UNIQUE へ
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_blocks' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.user_blocks ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
    ALTER TABLE public.user_blocks DROP CONSTRAINT IF EXISTS user_blocks_pkey;
    ALTER TABLE public.user_blocks ADD PRIMARY KEY (id);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.user_blocks'::regclass
        AND contype = 'u'
        AND conname = 'user_blocks_user_id_blocked_user_id_key'
    ) THEN
      ALTER TABLE public.user_blocks
        ADD CONSTRAINT user_blocks_user_id_blocked_user_id_key UNIQUE (user_id, blocked_user_id);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- subscriptions: id PK + user_id を UNIQUE NOT NULL へ
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
    ALTER TABLE public.subscriptions ADD PRIMARY KEY (id);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.subscriptions'::regclass
        AND contype = 'u'
        AND conname = 'subscriptions_user_id_key'
    ) THEN
      ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- rate_limit_buckets: id PK + (key, bucket_started_at) を UNIQUE へ
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rate_limit_buckets' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.rate_limit_buckets ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
    ALTER TABLE public.rate_limit_buckets DROP CONSTRAINT IF EXISTS rate_limit_buckets_pkey;
    ALTER TABLE public.rate_limit_buckets ADD PRIMARY KEY (id);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.rate_limit_buckets'::regclass
        AND contype = 'u'
        AND conname = 'rate_limit_buckets_key_bucket_started_at_key'
    ) THEN
      ALTER TABLE public.rate_limit_buckets
        ADD CONSTRAINT rate_limit_buckets_key_bucket_started_at_key UNIQUE (key, bucket_started_at);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- notification_preferences: id PK + user_id を UNIQUE NOT NULL へ
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.notification_preferences ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
    ALTER TABLE public.notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_pkey;
    ALTER TABLE public.notification_preferences ADD PRIMARY KEY (id);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.notification_preferences'::regclass
        AND contype = 'u'
        AND conname = 'notification_preferences_user_id_key'
    ) THEN
      ALTER TABLE public.notification_preferences
        ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);
    END IF;
  END IF;
END $$;
