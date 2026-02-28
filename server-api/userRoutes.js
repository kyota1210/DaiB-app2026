const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('./middleware/auth');
const UserModel = require('./models/UserModel');
const UserAvatarModel = require('./models/UserAvatarModel');
const logger = require('./utils/logger').createLogger('userRoutes');

// Multerの設定（記録の画像投稿と同じ方法）
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // 保存先
    },
    filename: function (req, file, cb) {
        // ファイル名重複防止のためタイムスタンプを付与
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// プロフィール更新エンドポイント
router.put('/profile', authenticateToken, (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) {
            logger.error('Multer Error', { 
                error: err.message, 
                stack: err.stack,
                userId: req.user ? req.user.id : null 
            });
            return res.status(400).json({ message: '画像のアップロードに失敗しました。', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const userId = req.user.id;
        const { user_name, bio } = req.body;

        // ユーザー名を更新
        if (user_name !== undefined) {
            const trimmed = String(user_name).trim();
            if (trimmed.length > 25) {
                return res.status(400).json({ message: 'ユーザー名は25文字以内で入力してください。' });
            }
            await UserModel.updateUserName(userId, trimmed);
        }

        // 自己紹介を更新
        if (bio !== undefined) {
            await UserModel.updateBio(userId, bio);
        }

        // アバター画像がアップロードされた場合
        if (req.file) {
            const imageUrl = `uploads/${req.file.filename}`;
            
            // 既存のアバター画像を取得（削除用）
            const existingAvatar = await UserAvatarModel.findByUserId(userId);
            
            // 新しいアバター画像を保存
            await UserAvatarModel.upsert(userId, imageUrl);
            
            // 古い画像ファイルを削除
            if (existingAvatar && existingAvatar.image_url) {
                const oldFilePath = path.join(__dirname, existingAvatar.image_url);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
        }

        // 更新後のユーザー情報を取得
        const updatedUser = await UserModel.findById(userId);
        const avatar = await UserAvatarModel.findByUserId(userId);

        logger.info('プロフィール更新成功', { 
            userId: userId,
            hasAvatar: !!req.file 
        });
        
        res.status(200).json({
            message: 'プロフィールを更新しました',
            user: {
                ...updatedUser,
                avatar_url: avatar ? avatar.image_url : null
            }
        });
    } catch (error) {
        logger.error('プロフィール更新エラー', { 
            error: error.message, 
            stack: error.stack,
            userId: userId 
        });
        res.status(500).json({ 
            message: 'プロフィール更新に失敗しました',
            error: error.message 
        });
    }
});

// ユーザー情報取得（アバター画像含む）
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await UserModel.findById(userId);
        const avatar = await UserAvatarModel.findByUserId(userId);

        if (!user) {
            return res.status(404).json({ message: 'ユーザーが見つかりません' });
        }

        res.status(200).json({
            user: {
                ...user,
                avatar_url: avatar ? avatar.image_url : null
            }
        });
    } catch (error) {
        logger.error('ユーザー情報取得エラー', { 
            error: error.message, 
            stack: error.stack,
            userId: userId 
        });
        res.status(500).json({ 
            message: 'ユーザー情報の取得に失敗しました',
            error: error.message 
        });
    }
});

module.exports = router;
