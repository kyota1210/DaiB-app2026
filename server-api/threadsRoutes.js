const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware/auth');
const FollowModel = require('./models/FollowModel');
const RecordModel = require('./models/RecordModel');
const logger = require('./utils/logger').createLogger('threadsRoutes');

router.use(authenticateToken);

// GET /api/threads/timeline - フォロー中ユーザーの直近7日間の記録
router.get('/timeline', async (req, res) => {
    try {
        const userId = req.user.id;
        const following = await FollowModel.getFollowingList(userId);
        const authorIds = following.map((u) => u.id);
        const records = await RecordModel.findTimelineByAuthorIds(authorIds);
        res.status(200).json({ records });
    } catch (err) {
        logger.error('タイムライン取得エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'タイムラインの取得に失敗しました。', error: err.message });
    }
});

module.exports = router;
