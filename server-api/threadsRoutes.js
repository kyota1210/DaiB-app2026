const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware/auth');
const FollowModel = require('./models/FollowModel');
const RecordModel = require('./models/RecordModel');
const ReactionModel = require('./models/ReactionModel');
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

        // 各レコードに対するログインユーザーのリアクションを付与
        const recordIds = records.map((r) => r.id);
        let myReactionsMap = {};
        if (recordIds.length > 0) {
            try {
                myReactionsMap = await ReactionModel.getMyReactionsForRecords(userId, recordIds);
            } catch (reactErr) {
                logger.error('リアクション取得エラー', { error: reactErr.message, stack: reactErr.stack, userId });
            }
        }
        const recordsWithReactions = records.map((r) => ({
            ...r,
            my_reaction: myReactionsMap[r.id] || null,
        }));

        res.status(200).json({ records: recordsWithReactions, memoryResurface });
    } catch (err) {
        logger.error('タイムライン取得エラー', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'タイムラインの取得に失敗しました。', error: err.message });
    }
});

module.exports = router;
