const jwt = require('jsonwebtoken');
const logger = require('../utils/logger').createLogger('auth');
const UserModel = require('../models/UserModel');

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/**
 * Supabase の JWT ペイロードからアプリ内 users 行を解決する
 */
async function resolveAppUserFromSupabaseJwt(decoded) {
    const sub = decoded.sub;
    const email = (decoded.email || '').trim().toLowerCase();
    const meta = decoded.user_metadata || {};
    let userName = meta.user_name || meta.display_name;
    if (typeof userName === 'string') {
        userName = userName.trim().slice(0, 25);
    }
    if (!userName && email) {
        userName = email.split('@')[0].slice(0, 25);
    }
    if (!userName) {
        userName = 'user';
    }

    let user = await UserModel.findBySupabaseUserId(sub);
    if (user) {
        return { id: user.id, email: user.email };
    }

    if (email) {
        const byEmail = await UserModel.findByEmail(email);
        if (byEmail) {
            await UserModel.linkSupabaseUserId(byEmail.id, sub);
            return { id: byEmail.id, email: byEmail.email };
        }
    }

    if (!email) {
        return null;
    }

    try {
        const insertId = await UserModel.createSupabaseLinked({
            email,
            userName,
            supabaseUserId: sub,
        });
        const row = await UserModel.findById(insertId);
        return { id: row.id, email: row.email };
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            const again = (await UserModel.findByEmail(email)) || (await UserModel.findBySupabaseUserId(sub));
            if (again) {
                if (!again.supabase_user_id) {
                    await UserModel.linkSupabaseUserId(again.id, sub);
                }
                return { id: again.id, email: again.email };
            }
        }
        throw e;
    }
}

/**
 * Authorization: Bearer に Supabase の access_token（JWT）を想定して検証する
 */
const auth = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: '認証トークンが提供されていません。' });
    }

    if (!SUPABASE_JWT_SECRET) {
        logger.error('SUPABASE_JWT_SECRET が未設定です');
        return res.status(500).json({ message: 'サーバー設定エラーです。' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');

    try {
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
        const resolved = await resolveAppUserFromSupabaseJwt(decoded);
        if (!resolved) {
            return res.status(403).json({ message: 'ユーザー情報を同期できません。' });
        }
        req.user = { id: resolved.id, email: resolved.email };
        next();
    } catch (error) {
        logger.warn('認証エラー', {
            error: error.message,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.status(401).json({ message: '無効なトークンです。再ログインが必要です。' });
    }
};

module.exports = auth;
