// Supabase Edge Function: moderate-image
//
// 投稿アップロード前に画像のセーフサーチ判定を行う。
// クライアントは画像を Storage にアップロードした後、その bucket + path を渡してくる。
// 本 Function 内で signed URL を発行し、Google Cloud Vision SafeSearch API で判定する。
//
// VISION_API_KEY が未設定の場合は判定をスキップ（== ok）して返す。
// これにより、開発環境や Vision API 未契約状態でもアプリは止まらない。
//
// リクエスト:
//   POST /functions/v1/moderate-image
//   Authorization: Bearer <user JWT>
//   Body: { "bucket": "posts", "path": "<userId>/<postId>/<file>.jpg" }
//
// レスポンス:
//   200 { ok: true, decision: "allow" | "review" | "block", scores: {...} }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { isRateLimited } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Google Cloud Vision API key（Cloud Console で発行 / API 制限を Vision に絞る）
const VISION_API_KEY = Deno.env.get('VISION_API_KEY') ?? '';

const ALLOWED_BUCKETS = new Set(['posts', 'avatars']);

// SafeSearch の各カテゴリでこのレベル以上なら block（VERY_LIKELY = 5, LIKELY = 4, POSSIBLE = 3）
const BLOCK_LEVEL = 4; // LIKELY 以上
const REVIEW_LEVEL = 3; // POSSIBLE は人手レビュー扱い（ここでは allow + review フラグ）

const LIKELIHOOD_RANK: Record<string, number> = {
    UNKNOWN: 0,
    VERY_UNLIKELY: 1,
    UNLIKELY: 2,
    POSSIBLE: 3,
    LIKELY: 4,
    VERY_LIKELY: 5,
};

const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });

interface SafeSearchScores {
    adult: number;
    violence: number;
    racy: number;
    medical: number;
    spoof: number;
}

const callVisionSafeSearch = async (signedUrl: string): Promise<SafeSearchScores> => {
    const body = {
        requests: [
            {
                image: { source: { imageUri: signedUrl } },
                features: [{ type: 'SAFE_SEARCH_DETECTION' }],
            },
        ],
    };
    const res = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
        {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        },
    );
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`vision_${res.status}: ${txt.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const ann = data?.responses?.[0]?.safeSearchAnnotation ?? {};
    return {
        adult: LIKELIHOOD_RANK[ann.adult ?? 'UNKNOWN'] ?? 0,
        violence: LIKELIHOOD_RANK[ann.violence ?? 'UNKNOWN'] ?? 0,
        racy: LIKELIHOOD_RANK[ann.racy ?? 'UNKNOWN'] ?? 0,
        medical: LIKELIHOOD_RANK[ann.medical ?? 'UNKNOWN'] ?? 0,
        spoof: LIKELIHOOD_RANK[ann.spoof ?? 'UNKNOWN'] ?? 0,
    };
};

const decideFromScores = (s: SafeSearchScores): 'allow' | 'review' | 'block' => {
    // 強い NSFW / 暴力は即 block
    if (s.adult >= BLOCK_LEVEL || s.violence >= BLOCK_LEVEL || s.racy >= BLOCK_LEVEL + 1) {
        return 'block';
    }
    // POSSIBLE 以上のものはレビュー対象
    if (s.adult >= REVIEW_LEVEL || s.violence >= REVIEW_LEVEL || s.racy >= REVIEW_LEVEL) {
        return 'review';
    }
    return 'allow';
};

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { error: 'misconfigured' });

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
        return json(401, { error: 'unauthorized' });
    }

    let payload: { bucket?: string; path?: string };
    try {
        payload = await req.json();
    } catch (_) {
        return json(400, { error: 'invalid_json' });
    }
    const bucket = String(payload.bucket ?? '').trim();
    const path = String(payload.path ?? '').trim();
    if (!bucket || !path) return json(400, { error: 'missing_fields' });
    if (!ALLOWED_BUCKETS.has(bucket)) return json(400, { error: 'invalid_bucket' });

    const userClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
        return json(401, { error: 'unauthorized', detail: userErr?.message });
    }
    const userId = userData.user.id;

    // 自分の prefix 配下のオブジェクトのみ判定可能（他人の画像を盗み見ない）
    if (!path.startsWith(`${userId}/`)) {
        return json(403, { error: 'forbidden_path' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // レート制限: 60 秒で 30 回（投稿の連続アップロード対策）
    if (await isRateLimited(admin, `moderate-image:${userId}`, 60, 30)) {
        return json(429, { error: 'too_many_requests' });
    }

    // Vision API 未設定なら判定スキップ
    if (!VISION_API_KEY) {
        return json(200, {
            ok: true,
            decision: 'allow',
            scores: null,
            note: 'vision_api_disabled',
        });
    }

    // 5 分間有効な signed URL を発行して Vision に渡す
    const { data: signed, error: signErr } = await admin
        .storage
        .from(bucket)
        .createSignedUrl(path, 300);
    if (signErr || !signed?.signedUrl) {
        return json(404, { error: 'object_not_found', detail: signErr?.message });
    }

    let scores: SafeSearchScores;
    try {
        scores = await callVisionSafeSearch(signed.signedUrl);
    } catch (e) {
        // Vision 側エラー時は allow にフォールバック（投稿を止めない）。
        // ただしログを残し、Sentry 経由でアラート対象にする。
        console.error(JSON.stringify({
            scope: 'moderate-image',
            step: 'vision-api',
            err: String(e),
            userId,
            bucket,
            path,
        }));
        return json(200, { ok: true, decision: 'allow', scores: null, note: 'vision_failed' });
    }

    const decision = decideFromScores(scores);
    return json(200, { ok: true, decision, scores });
});
