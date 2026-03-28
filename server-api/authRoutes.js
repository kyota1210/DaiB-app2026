const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('./models/UserModel'); // モデルを読み込み
const UserAvatarModel = require('./models/UserAvatarModel');
const auth = require('./middleware/auth'); // 認証ミドルウェア
const logger = require('./utils/logger').createLogger('authRoutes');

// JWTの秘密鍵は.envから取得
const JWT_SECRET = process.env.JWT_SECRET;

// ------------------------------------------------
// POST /api/auth/signup (ユーザー登録)
// ------------------------------------------------
router.post('/signup', async (req, res) => {
    const { email, user_name, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'メールアドレスとパスワードは必須です。' });
    }
    const emailTrimmed = String(email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ message: '正しいメールアドレスを入力してください。' });
    }
    if (!user_name || typeof user_name !== 'string' || !user_name.trim()) {
        return res.status(400).json({ message: 'ユーザー名は必須です。' });
    }
    if (user_name.trim().length > 25) {
        return res.status(400).json({ message: 'ユーザー名は25文字以内で入力してください。' });
    }
    if (password.length < 8 || password.length > 16) {
        return res.status(400).json({ message: 'パスワードは8文字以上16文字以内で入力してください。' });
    }
    if (!/^[!-~]{8,16}$/.test(password)) {
        return res.status(400).json({ message: 'パスワードは半角英数字と記号のみ使用できます。' });
    }

    try {
        // 既存ユーザーのチェック
        const existingUser = await UserModel.findByEmail(emailTrimmed);
        if (existingUser) {
            return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
        }

        // パスワードをハッシュ化
        const passwordHash = await bcrypt.hash(password, 10);
        
        // SQLはModelに任せる
        const userId = await UserModel.create({
            email: emailTrimmed,
            userName: user_name,
            passwordHash
        });

        res.status(201).json({ 
            message: 'ユーザー登録が完了しました。',
            userId
        });
    } catch (error) {
        // MySQLのエラーコード 'ER_DUP_ENTRY' はメールアドレス重複を意味します
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
        }
        logger.error('サインアップエラー', { 
            error: error.message, 
            stack: error.stack,
            email: email 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// POST /api/auth/login (ログイン)
// ------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'メールアドレスとパスワードは必須です。' });
    }
    const emailTrimmed = String(email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ message: '正しいメールアドレスを入力してください。' });
    }

    try {
        // メールアドレスでユーザーを検索
        const user = await UserModel.findByEmail(emailTrimmed);

        if (!user) {
            // ユーザーが見つからない場合
            return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません。' });
        }

        // 入力されたパスワードとDBのハッシュを比較
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません。' });
        }

        // 認証成功: トークン（JWT）を生成
        const token = jwt.sign(
            { id: user.id, email: user.email }, // user.emailが必要な場合があるため含めておく
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // ユーザー情報を再取得（bioを含む）
        const fullUser = await UserModel.findById(user.id);
        const avatar = await UserAvatarModel.findByUserId(user.id);

        // トークンとユーザー情報をクライアントに返す
        res.status(200).json({
            token: token,
            user: { 
                id: fullUser.id, 
                user_name: fullUser.user_name,
                email: fullUser.email,
                bio: fullUser.bio || null,
                avatar_url: avatar ? avatar.image_url : null,
                default_view_mode: fullUser.default_view_mode || 'grid',
                default_sort_order: fullUser.default_sort_order || 'date_logged'
            }
        });

    } catch (error) {
        logger.error('ログインエラー', { 
            error: error.message, 
            stack: error.stack,
            email: email 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
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