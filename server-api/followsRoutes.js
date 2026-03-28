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
            const isFriend = await FollowModel.isFriend(followerId, followingId);
            return res.status(200).json({ message: '既にフォローしています。', following: true, is_friend: isFriend });
        }
        await FollowModel.create(followerId, followingId);
        const isFriend = await FollowModel.isFriend(followerId, followingId);
        logger.info('フォロー成功', { followerId, followingId, isFriend });
        res.status(201).json({ message: 'フォローしました。', following: true, is_friend: isFriend });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(200).json({ message: '既にフォローしています。', following: true });
        }
        logger.error('フォローエラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'フォローに失敗しました。', error: err.message });
    }
});

// DELETE /api/follows/incoming/:follower_id - 相手からのフォロー（フレンド申請）を拒否＝そのフォロー関係を削除
// 申請者側の「申請中」一覧からも当該エントリが消える（同じ follows 行を論理削除するため）
router.delete('/incoming/:follower_id', async (req, res) => {
    try {
        const followeeId = req.user.id;
        const followerId = parseInt(req.params.follower_id, 10);
        if (!Number.isInteger(followerId)) {
            return res.status(400).json({ message: 'follower_id が不正です。' });
        }
        if (followerId === followeeId) {
            return res.status(400).json({ message: '不正なリクエストです。' });
        }
        const deleted = await FollowModel.delete(followerId, followeeId);
        if (deleted) logger.info('申請拒否（フォロー削除）', { followerId, followeeId });
        res.status(200).json({
            message: deleted ? '申請を却下しました。' : '該当する申請はありません。',
            rejected: !!deleted,
        });
    } catch (err) {
        logger.error('申請拒否エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: '申請の却下に失敗しました。', error: err.message });
    }
});

// DELETE /api/follows/:following_id - フォロー解除（論理削除）
router.delete('/:following_id', async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.following_id, 10);
        if (!Number.isInteger(followingId)) {
            return res.status(400).json({ message: 'following_id が不正です。' });
        }
        const deleted = await FollowModel.delete(followerId, followingId);
        if (deleted) logger.info('フォロー解除成功', { followerId, followingId });
        res.status(200).json({ message: deleted ? 'フォローを解除しました。' : 'フォロー関係はありません。', following: false, is_friend: false });
    } catch (err) {
        logger.error('フォロー解除エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'フォロー解除に失敗しました。', error: err.message });
    }
});

module.exports = router;
