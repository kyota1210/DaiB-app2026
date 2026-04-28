// Apple App Store Server API クライアント。
// - JWT 認証トークン発行（ES256, kid=Key ID, iss=Issuer ID）
// - getSubscriptionStatuses(originalTransactionId) で最新ステータスを取得
//
// 必要な Supabase Secrets:
//   APPLE_IAP_ISSUER_ID
//   APPLE_IAP_KEY_ID
//   APPLE_IAP_PRIVATE_KEY  (.p8 ファイルの PEM 内容)
//   APPLE_BUNDLE_ID
// オプション:
//   APPLE_IAP_USE_SANDBOX="true" のとき Sandbox エンドポイント

import { create as createJwt, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const APPLE_PROD = 'https://api.storekit.itunes.apple.com/inApps/v1';
const APPLE_SANDBOX = 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1';

const ISSUER_ID = Deno.env.get('APPLE_IAP_ISSUER_ID') ?? '';
const KEY_ID = Deno.env.get('APPLE_IAP_KEY_ID') ?? '';
const PRIVATE_KEY_PEM = Deno.env.get('APPLE_IAP_PRIVATE_KEY') ?? '';
const BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? '';
const USE_SANDBOX = (Deno.env.get('APPLE_IAP_USE_SANDBOX') ?? '').toLowerCase() === 'true';

const baseUrl = () => (USE_SANDBOX ? APPLE_SANDBOX : APPLE_PROD);

const pemToCryptoKey = async (pem: string): Promise<CryptoKey> => {
    const stripped = pem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s+/g, '');
    const der = Uint8Array.from(atob(stripped), (c) => c.charCodeAt(0));
    return await crypto.subtle.importKey(
        'pkcs8',
        der.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
    );
};

let cachedToken: { token: string; exp: number } | null = null;

export const getAppleAuthToken = async (): Promise<string> => {
    if (!ISSUER_ID || !KEY_ID || !PRIVATE_KEY_PEM || !BUNDLE_ID) {
        throw new Error('apple_iap_misconfigured');
    }
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && cachedToken.exp - 60 > now) {
        return cachedToken.token;
    }
    const key = await pemToCryptoKey(PRIVATE_KEY_PEM);
    const exp = getNumericDate(60 * 30); // 30 分（最大 1 時間）
    const token = await createJwt(
        { alg: 'ES256', kid: KEY_ID, typ: 'JWT' },
        {
            iss: ISSUER_ID,
            iat: getNumericDate(0),
            exp,
            aud: 'appstoreconnect-v1',
            bid: BUNDLE_ID,
        },
        key,
    );
    cachedToken = { token, exp };
    return token;
};

export type AppleStatusResponse = {
    data?: Array<{
        subscriptionGroupIdentifier: string;
        lastTransactions?: Array<{
            originalTransactionId: string;
            status: number; // 1=active 2=expired 3=in_billing_retry 4=in_grace 5=revoked
            signedTransactionInfo: string;
            signedRenewalInfo: string;
        }>;
    }>;
};

export const fetchSubscriptionStatuses = async (
    originalTransactionId: string,
): Promise<AppleStatusResponse> => {
    const token = await getAppleAuthToken();
    const url = `${baseUrl()}/subscriptions/${encodeURIComponent(originalTransactionId)}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`apple_status_${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as AppleStatusResponse;
};

// Apple の signedTransactionInfo / signedRenewalInfo は JWS（JWT）。
// 検証は本来 x5c チェーンを Apple ルート CA まで辿るのが正しいが、
// Edge Function ランタイムでは X.509 検証ライブラリが限定的なので、
// MVP として「ペイロード部のみデコード」して使用する。
// 後日 jose 等を入れて x5c 検証に差し替えること。
export const decodeJws = <T = unknown>(jws: string): T => {
    const parts = jws.split('.');
    if (parts.length < 2) throw new Error('invalid_jws');
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '==='.slice((payload.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json) as T;
};

export const mapAppleStatus = (status: number): string => {
    switch (status) {
        case 1: return 'active';
        case 2: return 'expired';
        case 3: return 'in_billing_retry';
        case 4: return 'in_grace_period';
        case 5: return 'revoked';
        default: return 'unknown';
    }
};
