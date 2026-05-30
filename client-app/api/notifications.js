import { supabase } from '../utils/supabase';

/**
 * アプリ内通知の一覧を取得する（新しい順）。
 */
export async function getInAppNotifications({ limit = 50, offset = 0 } = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('in_app_notifications')
        .select('id, type, title, body, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.warn('[notifications] getInAppNotifications failed:', error.message);
        return [];
    }
    return data ?? [];
}

/**
 * 未読の通知件数を取得する。
 */
export async function getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
        .from('in_app_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) {
        console.warn('[notifications] getUnreadCount failed:', error.message);
        return 0;
    }
    return count ?? 0;
}

/**
 * 指定した通知を既読にする。
 */
export async function markAsRead(notificationId) {
    const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        console.warn('[notifications] markAsRead failed:', error.message);
    }
}

/**
 * 全通知を既読にする。
 */
export async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) {
        console.warn('[notifications] markAllAsRead failed:', error.message);
    }
}

/**
 * 管理者が全ユーザーへシステム通知を配信する Edge Function を呼び出す。
 * @param {{ title: string, body: string }} params
 * @returns {{ inserted: number }} 配信件数
 */
export async function sendSystemNotification({ title, body }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('認証が必要です。');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) throw new Error('SUPABASE_URL が設定されていません。');

    const res = await fetch(`${supabaseUrl}/functions/v1/send-system-notification`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = json?.detail ?? json?.error ?? res.statusText;
        throw new Error(`配信に失敗しました: ${detail}`);
    }
    return json;
}

/**
 * 配信履歴一覧を取得する（管理者用・新しい順）。
 */
export async function getNotificationsLog({ limit = 30 } = {}) {
    const { data, error } = await supabase
        .from('notifications_log')
        .select('id, type, title, body, sent_at, sent_by')
        .order('sent_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.warn('[notifications] getNotificationsLog failed:', error.message);
        return [];
    }
    return data ?? [];
}

