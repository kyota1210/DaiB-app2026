// 共有レート制限ヘルパー。
// public.rate_limit_check(key, window_seconds, limit) RPC を service_role で呼び、
// 超過していたら true（== blocked）を返す。
//
// 利用側:
//   const blocked = await checkRateLimit(admin, `verify-iap:${userId}`, 60, 10);
//   if (blocked) return json(429, { error: 'too_many_requests' });

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export interface RateLimitResult {
    allowed: boolean;
    currentCount: number;
}

export async function rateLimitCheck(
    admin: SupabaseClient,
    key: string,
    windowSeconds: number,
    limit: number,
): Promise<RateLimitResult> {
    if (!key) {
        return { allowed: true, currentCount: 0 };
    }
    const { data, error } = await admin.rpc('rate_limit_check', {
        p_key: key,
        p_window_seconds: windowSeconds,
        p_limit: limit,
    });
    if (error) {
        console.warn('rate_limit_check rpc failed; allowing fallback:', error.message);
        return { allowed: true, currentCount: 0 };
    }
    const row: any = Array.isArray(data) ? data[0] : data;
    return {
        allowed: Boolean(row?.allowed),
        currentCount: Number(row?.current_count ?? 0),
    };
}

// 高水準ヘルパー: 超過していたら true を返す
export async function isRateLimited(
    admin: SupabaseClient,
    key: string,
    windowSeconds: number,
    limit: number,
): Promise<boolean> {
    const r = await rateLimitCheck(admin, key, windowSeconds, limit);
    return !r.allowed;
}
