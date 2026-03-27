const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware/auth');
const ReactionModel = require('./models/ReactionModel');
const RecordModel = require('./models/RecordModel');
const logger = require('./utils/logger').createLogger('reactionsRoutes');

const ALLOWED_EMOJIS = ['❤️', '👍', '🌸', '🎉', '✨'];

router.use(authenticateToken);

// POST /api/reactions - リアクション追加/上書き（削除不可）
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { record_id, emoji } = req.body;

        if (!record_id || !emoji) {
            return res.status(400).json({ message: 'record_id と emoji は必須です。' });
        }
        if (!ALLOWED_EMOJIS.includes(emoji)) {
            return res.status(400).json({ message: '許可されていない絵文字です。' });
        }

        await ReactionModel.upsertReaction(record_id, userId, emoji);
        res.status(200).json({ success: true });
    } catch (err) {
        logger.error('リアクション追加エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'リアクションの追加に失敗しました。' });
    }
});

// DELETE /api/reactions - 削除不可仕様のため未対応
router.delete('/', async (req, res) => {
    return res.status(405).json({ message: 'リアクションの削除はできません。' });
});

// GET /api/reactions/:recordId/details - 誰がどのリアクションをくれたかの詳細（投稿者本人のみ）
router.get('/:recordId/details', async (req, res) => {
    try {
        const userId = req.user.id;
        const recordId = req.params.recordId;

        const record = await RecordModel.findById(recordId, userId);
        if (!record) {
            return res.status(403).json({ message: 'この投稿のリアクションを閲覧する権限がありません。' });
        }

        const details = await ReactionModel.getReactionDetails(recordId);
        res.status(200).json({ details });
    } catch (err) {
        logger.error('リアクション詳細取得エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'リアクション詳細の取得に失敗しました。' });
    }
});

// GET /api/reactions/:recordId - 自分の投稿へのリアクション集計（投稿者本人のみ）
router.get('/:recordId', async (req, res) => {
    try {
        const userId = req.user.id;
        const recordId = req.params.recordId;

        const record = await RecordModel.findById(recordId, userId);
        if (!record) {
            return res.status(403).json({ message: 'この投稿のリアクションを閲覧する権限がありません。' });
        }

        const summary = await ReactionModel.getReactionSummary(recordId);
        res.status(200).json({ summary });
    } catch (err) {
        logger.error('リアクション集計取得エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'リアクション情報の取得に失敗しました。' });
    }
});

module.exports = router;
