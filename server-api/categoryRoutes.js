const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware/auth');
const CategoryModel = require('./models/CategoryModel');

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
        const { name } = req.body;

        // バリデーション
        if (!name) {
            return res.status(400).json({ message: 'カテゴリー名は必須です。' });
        }

        const categoryId = await CategoryModel.create({ userId, name });
        
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
        const { name } = req.body;

        // バリデーション
        if (!name) {
            return res.status(400).json({ message: 'カテゴリー名は必須です。' });
        }

        // カテゴリーの存在と所有者を確認
        const existingCategory = await CategoryModel.findById(categoryId, userId);
        if (!existingCategory) {
            return res.status(404).json({ message: 'カテゴリーが見つかりません。' });
        }

        const updated = await CategoryModel.update(categoryId, userId, { name });
        
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

module.exports = router;
