import * as Linking from 'expo-linking';
import { supabase } from './supabase';

const AUTH_CALLBACK_PATH = '/auth/callback';

/**
 * Supabase signUp / メール確認メール用の redirect URL。
 * app.json の scheme と一致する URL を生成（Supabase の Redirect URLs に登録すること）。
 * 上書き: EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_TO
 */
export function getAuthEmailRedirectTo() {
    const fromEnv = process.env.EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_TO;
    if (fromEnv && String(fromEnv).trim()) {
        return String(fromEnv).trim();
    }
    return Linking.createURL(AUTH_CALLBACK_PATH);
}

function parseAuthParamsFromUrl(url) {
    const result = {};
    try {
        const parsed = new URL(url);
        if (parsed.hash?.startsWith('#')) {
            new URLSearchParams(parsed.hash.slice(1)).forEach((value, key) => {
                result[key] = value;
            });
        }
        parsed.searchParams.forEach((value, key) => {
            result[key] = value;
        });
    } catch {
        return null;
    }
    return result;
}

/**
 * メール確認などのリダイレクト URL（fragment / query のトークン）からセッションを復元する。
 * React Native ではブラウザの自動検出が使えないため手動で呼ぶ。
 */
export async function applySupabaseAuthTokensFromUrl(url) {
    if (!url || typeof url !== 'string') {
        return { handled: false };
    }

    const params = parseAuthParamsFromUrl(url);
    if (!params) {
        return { handled: false };
    }

    if (params.error || params.error_code) {
        const message = params.error_description || params.error || '認証リンクが無効です。';
        return { handled: true, error: message };
    }

    if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
        });
        if (error) {
            return { handled: true, error: error.message };
        }
        return { handled: true };
    }

    if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) {
            return { handled: true, error: error.message };
        }
        return { handled: true };
    }

    return { handled: false };
}
