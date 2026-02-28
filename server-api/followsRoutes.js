const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware/auth');
const FollowModel = require('./models/FollowModel');
const UserModel = require('./models/UserModel');
const UserAvatarModel = require('./models/UserAvatarModel');
const logger = require('./utils/logger').createLogger('followsRoutes');

router.use(authenticateToken);

// POST /api/follows - フォローする
router.post('/', async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.body.following_id, 10);
        if (!Number.isInteger(followingId)) {
            return res.status(400).json({ message: 'following_id が不正です。' });
        }
        if (followerId === followingId) {
            return res.status(400).json({ message: '自分自身はフォローできません。' });
        }
        const target = await UserModel.findById(followingId);
        if (!target) {
            return res.status(404).json({ message: 'ユーザーが見つかりません。' });
        }
        const existing = await FollowModel.isFollowing(followerId, followingId);
        if (existing) {
            return res.status(200).json({ message: '既にフォローしています。', following: true });
        }
        await FollowModel.create(followerId, followingId);
        logger.info('フォロー成功', { followerId, followingId });
        res.status(201).json({ message: 'フォローしました。', following: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(200).json({ message: '既にフォローしています。', following: true });
        }
        logger.error('フォローエラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'フォローに失敗しました。', error: err.message });
    }
});

// DELETE /api/follows/:following_id - フォロー解除
router.delete('/:following_id', async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.following_id, 10);
        if (!Number.isInteger(followingId)) {
            return res.status(400).json({ message: 'following_id が不正です。' });
        }
        const deleted = await FollowModel.delete(followerId, followingId);
        if (deleted) logger.info('フォロー解除成功', { followerId, followingId });
        res.status(200).json({ message: deleted ? 'フォローを解除しました。' : 'フォロー関係はありません。', following: false });
    } catch (err) {
        logger.error('フォロー解除エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'フォロー解除に失敗しました。', error: err.message });
    }
});

module.exports = router;
