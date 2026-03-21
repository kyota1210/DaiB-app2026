const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware/auth');
const FollowModel = require('./models/FollowModel');
const RecordModel = require('./models/RecordModel');
const { resolveMemoryResurface } = require('./services/memoryResurfaceService');
const logger = require('./utils/logger').createLogger('threadsRoutes');

router.use(authenticateToken);

// GET /api/threads/timeline - フォロー中ユーザーの直近7日間の記録
router.get('/timeline', async (req, res) => {
    try {
        const userId = req.user.id;
        const following = await FollowModel.getFollowingList(userId);
        const authorIds = following.map((u) => u.id);
        const records = await RecordModel.findTimelineByAuthorIds(authorIds);
        const clientTz = req.get('x-client-timezone') || req.get('X-Client-Timezone');
        let memoryResurface = null;
        try {
            memoryResurface = await resolveMemoryResurface(userId, clientTz);
        } catch (memErr) {
            logger.error('再浮上解決エラー', { error: memErr.message, stack: memErr.stack, userId });
        }
        res.status(200).json({ records, memoryResurface });
    } catch (err) {
        logger.error('タイムライン取得エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'タイムラインの取得に失敗しました。', error: err.message });
    }
});

module.exports = router;
