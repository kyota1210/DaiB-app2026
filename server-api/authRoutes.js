const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const UserModel = require('./models/UserModel'); // モデルを読み込み
const UserAvatarModel = require('./models/UserAvatarModel');
const auth = require('./middleware/auth'); // 認証ミドルウェア
const logger = require('./utils/logger').createLogger('authRoutes');

// ------------------------------------------------
// POST /api/auth/signup — 廃止（認証は Supabase Auth）
// ------------------------------------------------
router.post('/signup', (req, res) => {
    res.status(410).json({
        message: 'ユーザー登録はアプリの Supabase 認証から行ってください。',
        code: 'USE_SUPABASE_AUTH',
    });
});

// ------------------------------------------------
// POST /api/auth/login — 廃止（認証は Supabase Auth）
// ------------------------------------------------
router.post('/login', (req, res) => {
    res.status(410).json({
        message: 'ログインはアプリの Supabase 認証から行ってください。',
        code: 'USE_SUPABASE_AUTH',
    });
});


// ------------------------------------------------
// POST /api/auth/forgot-password (パスワード再発行リクエスト・簡易版はレスポンスでトークン返却)
// ------------------------------------------------
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const emailTrimmed = email ? String(email).trim() : '';
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ message: '正しいメールアドレスを入力してください。' });
    }

    try {
        const user = await UserModel.findByEmail(emailTrimmed);
        // ユーザー列挙対策: 存在しなくても同じメッセージで返す（トークンは返さない）
        if (!user) {
            return res.status(200).json({
                message: 'ご登録のメールアドレスにパスワード再設定のご案内を送信しました。',
            });
        }

        const { token, expiresAt } = await UserModel.createPasswordResetToken(user.id, 60);
        // 簡易版: レスポンスでトークンを返す（本番ではメール送信に切り替え、ここでは token を返さない）
        return res.status(200).json({
            message: 'パスワード再設定用のトークンを発行しました。',
            reset_token: token,
            expires_at: expiresAt.toISOString(),
        });
    } catch (error) {
        logger.error('forgot-password エラー', { error: error.message, stack: error.stack, email: emailTrimmed });
        return res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// POST /api/auth/reset-password (トークンと新パスワードでパスワード更新)
// ------------------------------------------------
router.post('/reset-password', async (req, res) => {
    const { token, new_password } = req.body;
    if (!token || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({ message: 'トークンが無効です。' });
    }
    if (!new_password || new_password.length < 8 || new_password.length > 16) {
        return res.status(400).json({ message: 'パスワードは8文字以上16文字以内で入力してください。' });
    }
    if (!/^[!-~]{8,16}$/.test(new_password)) {
        return res.status(400).json({ message: 'パスワードは半角英数字と記号のみ使用できます。' });
    }

    try {
        const userId = await UserModel.findValidResetToken(token.trim());
        if (!userId) {
            return res.status(400).json({ message: 'トークンが無効または有効期限切れです。再度パスワード再発行をお試しください。' });
        }

        const passwordHash = await bcrypt.hash(new_password, 10);
        await UserModel.updatePassword(userId, passwordHash);
        await UserModel.invalidateResetToken(token.trim());

        return res.status(200).json({ message: 'パスワードを変更しました。新しいパスワードでログインしてください。' });
    } catch (error) {
        logger.error('reset-password エラー', { error: error.message, stack: error.stack });
        return res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// GET /api/auth/me (ログイン中のユーザー情報を取得)
// ------------------------------------------------
router.get('/me', auth, async (req, res) => {
    try {
        // 認証ミドルウェアで req.user.id が設定されている
        const user = await UserModel.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'ユーザーが見つかりません。' });
        }

        // アバター画像を取得
        const avatar = await UserAvatarModel.findByUserId(req.user.id);

        // パスワードハッシュを除外してユーザー情報を返す
        res.status(200).json({
            user: { 
                id: user.id, 
                user_name: user.user_name,
                email: user.email,
                bio: user.bio || null,
                avatar_url: avatar ? avatar.image_url : null,
                default_view_mode: user.default_view_mode || 'grid',
                default_sort_order: user.default_sort_order || 'date_logged'
            }
        });
    } catch (error) {
        logger.error('ユーザー情報取得エラー', { 
            error: error.message, 
            stack: error.stack,
            userId: req.user.id 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});


module.exports = router;