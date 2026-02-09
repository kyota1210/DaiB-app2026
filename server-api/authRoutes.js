const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('./models/UserModel'); // モデルを読み込み
const UserAvatarModel = require('./models/UserAvatarModel');
const auth = require('./middleware/auth'); // 認証ミドルウェア

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

    try {
        // 既存ユーザーのチェック
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
        }

        // パスワードをハッシュ化
        const passwordHash = await bcrypt.hash(password, 10);
        
        // SQLはModelに任せる
        const userId = await UserModel.create({
            email,
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
        console.error('サインアップエラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// POST /api/auth/login (ログイン)
// ------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // メールアドレスでユーザーを検索
        const user = await UserModel.findByEmail(email);

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
                bio: fullUser.bio || null,
                avatar_url: avatar ? avatar.image_url : null
            }
        });

    } catch (error) {
        console.error('ログインエラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
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
                avatar_url: avatar ? avatar.image_url : null
            }
        });
    } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});


module.exports = router;