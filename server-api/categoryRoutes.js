const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware/auth');
const CategoryModel = require('./models/CategoryModel');
const logger = require('./utils/logger').createLogger('categoryRoutes');

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
        logger.error('カテゴリー取得エラー', { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id 
        });
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
        
        logger.info('カテゴリー作成成功', { 
            categoryId, 
            userId,
            categoryName: name 
        });
        
        res.status(201).json({ 
            message: 'カテゴリーを作成しました。',
            category 
        });
    } catch (error) {
        logger.error('カテゴリー作成エラー', { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id,
            categoryName: req.body?.name 
        });
        res.status(500).json({ message: 'カテゴリーの作成に失敗しました。' });
    }
});

/**
 * PUT /api/categories/reorder
 * カテゴリーの並び順を更新（body: { category_ids: [id1, id2, ...] }）
 */
router.put('/reorder', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { category_ids: categoryIds } = req.body;
        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
            return res.status(400).json({ message: 'category_ids は配列で指定してください。' });
        }
        const success = await CategoryModel.reorder(userId, categoryIds);
        if (!success) {
            return res.status(400).json({ message: '並び替えに失敗しました。指定したカテゴリーのいずれかが存在しません。' });
        }
        const categories = await CategoryModel.findAllByUserId(userId);
        res.status(200).json({ message: '並び順を更新しました。', categories });
    } catch (error) {
        logger.error('カテゴリー並び替えエラー', { error: error.message, stack: error.stack, userId: req.user?.id });
        res.status(500).json({ message: '並び替えに失敗しました。' });
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
        if (categoryId === 'reorder') {
            return res.status(404).json({ message: '並び替えは PUT /api/categories/reorder を使用してください。' });
        }
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
        
        logger.info('カテゴリー更新成功', { 
            categoryId, 
            userId,
            categoryName: name 
        });
        
        res.status(200).json({ 
            message: 'カテゴリーを更新しました。',
            category 
        });
    } catch (error) {
        logger.error('カテゴリー更新エラー', { 
            error: error.message, 
            stack: error.stack,
            categoryId: req.params?.id,
            userId: req.user?.id,
            categoryName: req.body?.name 
        });
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

        logger.info('カテゴリー削除成功', { 
            categoryId, 
            userId 
        });
        
        res.status(200).json({ message: 'カテゴリーを削除しました。' });
    } catch (error) {
        logger.error('カテゴリー削除エラー', { 
            error: error.message, 
            stack: error.stack,
            categoryId: req.params?.id,
            userId: req.user?.id 
        });
        res.status(500).json({ message: 'カテゴリーの削除に失敗しました。' });
    }
});

module.exports = router;
