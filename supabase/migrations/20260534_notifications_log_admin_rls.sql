-- notifications_log: is_admin = true のユーザーのみ参照可能
CREATE POLICY "notifications_log: admin read"
    ON public.notifications_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
