-- トリガー関数を修正: アプリ API ロール（authenticated/anon）のみブロック
-- postgres / service_role からの直接 SQL は is_admin を変更可能
CREATE OR REPLACE FUNCTION public.prevent_is_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon')
       AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'is_admin cannot be changed via the API';
    END IF;
    RETURN NEW;
END;
$$;
