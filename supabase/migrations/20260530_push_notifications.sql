-- ===========================================================
-- プッシュ通知からアプリ内通知＋メール通知方式への移行
-- ===========================================================

-- アプリ内通知テーブル（システム通知をユーザーごとに格納）
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id         uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type       text NOT NULL CHECK (type IN ('system', 'security')),
    title      text NOT NULL,
    body       text NOT NULL,
    is_read    boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 通知設定テーブル（セキュリティメール通知の ON/OFF のみ管理）
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id                uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    security_email_enabled boolean NOT NULL DEFAULT true,
    updated_at             timestamptz DEFAULT now() NOT NULL
);

-- 配信履歴テーブル（管理・デバッグ用）
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id       uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    type     text NOT NULL CHECK (type IN ('system', 'security')),
    title    text NOT NULL,
    body     text NOT NULL,
    sent_at  timestamptz DEFAULT now() NOT NULL,
    sent_by  text
);

-- ===========================================================
-- RLS 設定
-- ===========================================================

ALTER TABLE public.in_app_notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log        ENABLE ROW LEVEL SECURITY;

-- in_app_notifications: 本人のみ参照・既読更新可
DROP POLICY IF EXISTS "in_app_notifications: own read"   ON public.in_app_notifications;
DROP POLICY IF EXISTS "in_app_notifications: own update" ON public.in_app_notifications;

CREATE POLICY "in_app_notifications: own read"
    ON public.in_app_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "in_app_notifications: own update"
    ON public.in_app_notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- notification_preferences: 本人のみ参照・挿入・更新可
DROP POLICY IF EXISTS "notification_preferences: own read"   ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences: own insert" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences: own update" ON public.notification_preferences;

CREATE POLICY "notification_preferences: own read"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences: own insert"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences: own update"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- notifications_log: ユーザーは参照不可（service_role のみ）

-- ===========================================================
-- インデックス
-- ===========================================================

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id
    ON public.in_app_notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread
    ON public.in_app_notifications (user_id, is_read)
    WHERE is_read = false;
