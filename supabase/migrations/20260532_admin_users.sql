-- ===========================================================
-- 管理者機能: profiles に is_admin 列を追加
-- ===========================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- is_admin をアプリ API（authenticated ロール）から変更できないようにするトリガー。
-- Supabase SQL エディタや service_role からの直接 SQL は postgres ロールで実行されるため通過する。
CREATE OR REPLACE FUNCTION public.prevent_is_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- current_user が authenticated / anon の場合のみブロック
    -- postgres / service_role からの直接 SQL は許可
    IF current_user IN ('authenticated', 'anon')
       AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'is_admin cannot be changed via the API';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_is_admin_change ON public.profiles;

CREATE TRIGGER trg_prevent_is_admin_change
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_is_admin_change();
