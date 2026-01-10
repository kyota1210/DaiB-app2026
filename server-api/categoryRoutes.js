const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('./middleware/auth');
const CategoryModel = require('./models/CategoryModel');
const CategoryImageModel = require('./models/CategoryImageModel');

// Multerの設定（カテゴリ画像用）
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/categories/';
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB制限
});

/**
 * GET /api/categories
 * ユーザーのカテゴリー一覧を取得
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const categories = await CategoryModel.findAllByUserId(userId);
        res.status(200).json({ categories });
    } catch (error) {
        console.error('カテゴリー取得エラー:', error);
        res.status(500).json({ message: 'カテゴリーの取得に失敗しました。' });
    }
});

/**
 * POST /api/categories
 * 新しいカテゴリーを作成
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, icon, color } = req.body;

        // バリデーション
        if (!name || !icon || !color) {
            return res.status(400).json({ message: 'カテゴリー名、アイコン、カラーは必須です。' });
        }

        const categoryId = await CategoryModel.create({ userId, name, icon, color });
        
        // 作成したカテゴリーを取得して返す
        const category = await CategoryModel.findById(categoryId, userId);
        
        res.status(201).json({ 
            message: 'カテゴリーを作成しました。',
            category 
        });
    } catch (error) {
        console.error('カテゴリー作成エラー:', error);
        res.status(500).json({ message: 'カテゴリーの作成に失敗しました。' });
    }
});

/**
 * PUT /api/categories/:id
 * カテゴリーを更新
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const categoryId = req.params.id;
        const { name, icon, color } = req.body;

        // バリデーション
        if (!name || !icon || !color) {
            return res.status(400).json({ message: 'カテゴリー名、アイコン、カラーは必須です。' });
        }

        // カテゴリーの存在と所有者を確認
        const existingCategory = await CategoryModel.findById(categoryId, userId);
        if (!existingCategory) {
            return res.status(404).json({ message: 'カテゴリーが見つかりません。' });
        }

        const updated = await CategoryModel.update(categoryId, userId, { name, icon, color });
        
        if (!updated) {
            return res.status(404).json({ message: 'カテゴリーの更新に失敗しました。' });
        }

        // 更新後のカテゴリーを取得して返す
        const category = await CategoryModel.findById(categoryId, userId);
        
        res.status(200).json({ 
            message: 'カテゴリーを更新しました。',
            category 
        });
    } catch (error) {
        console.error('カテゴリー更新エラー:', error);
        res.status(500).json({ message: 'カテゴリーの更新に失敗しました。' });
    }
});

/**
 * DELETE /api/categories/:id
 * カテゴリーを削除
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const categoryId = req.params.id;

        // カテゴリーの存在と所有者を確認
        const existingCategory = await CategoryModel.findById(categoryId, userId);
        if (!existingCategory) {
            return res.status(404).json({ message: 'カテゴリーが見つかりません。' });
        }

        // カテゴリに紐づく画像がある場合は削除
        if (existingCategory.image_url) {
            const imagePath = path.join(__dirname, '..', existingCategory.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        const deleted = await CategoryModel.delete(categoryId, userId);
        
        if (!deleted) {
            return res.status(404).json({ message: 'カテゴリーの削除に失敗しました。' });
        }

        res.status(200).json({ message: 'カテゴリーを削除しました。' });
    } catch (error) {
        console.error('カテゴリー削除エラー:', error);
        res.status(500).json({ message: 'カテゴリーの削除に失敗しました。' });
    }
});

/**
 * PUT /api/categories/:id/image
 * カテゴリー画像をアップロード
 */
router.put('/:id/image', authenticateToken, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(400).json({ message: '画像のアップロードに失敗しました。', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const userId = req.user.id;
        const categoryId = req.params.id;

        console.log('画像アップロードリクエスト:', {
            categoryId,
            userId,
            hasFile: !!req.file,
            file: req.file
        });

        // カテゴリーの存在と所有者を確認
        const existingCategory = await CategoryModel.findById(categoryId, userId);
        if (!existingCategory) {
            return res.status(404).json({ message: 'カテゴリーが見つかりません。' });
        }

        if (!req.file) {
            console.error('ファイルがアップロードされていません');
            return res.status(400).json({ message: '画像ファイルが必要です。' });
        }

        const imageUrl = `uploads/categories/${req.file.filename}`;

        // 既存の画像がある場合は削除
        if (existingCategory.image_url) {
            const oldImagePath = path.join(__dirname, '..', existingCategory.image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // 既存のレコードがあるかチェック
        const existingImage = await CategoryImageModel.findByCategoryId(categoryId);
        
        if (existingImage) {
            // 更新
            await CategoryImageModel.update(categoryId, imageUrl);
        } else {
            // 新規作成
            await CategoryImageModel.create(categoryId, imageUrl);
        }

        // 更新後のカテゴリー情報を取得
        const updatedCategory = await CategoryModel.findById(categoryId, userId);

        res.status(200).json({
            message: 'カテゴリー画像をアップロードしました。',
            category: updatedCategory
        });
    } catch (error) {
        console.error('画像アップロードエラー:', error);
        res.status(500).json({ message: '画像のアップロードに失敗しました。', error: error.message });
    }
});

/**
 * DELETE /api/categories/:id/image
 * カテゴリー画像を削除
 */
router.delete('/:id/image', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const categoryId = req.params.id;

        // カテゴリーの存在と所有者を確認
        const existingCategory = await CategoryModel.findById(categoryId, userId);
        if (!existingCategory) {
            return res.status(404).json({ message: 'カテゴリーが見つかりません。' });
        }

        // 画像が存在するか確認
        if (!existingCategory.image_url) {
            return res.status(404).json({ message: 'カテゴリー画像が設定されていません。' });
        }

        // ファイルシステムから画像を削除
        const imagePath = path.join(__dirname, '..', existingCategory.image_url);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        // データベースから画像レコードを削除
        await CategoryImageModel.delete(categoryId);

        // 更新後のカテゴリー情報を取得
        const updatedCategory = await CategoryModel.findById(categoryId, userId);

        res.status(200).json({
            message: 'カテゴリー画像を削除しました。',
            category: updatedCategory
        });
    } catch (error) {
        console.error('画像削除エラー:', error);
        res.status(500).json({ message: '画像の削除に失敗しました。' });
    }
});

module.exports = router;
