const db = require('../db');

class ReactionModel {
    static async upsertReaction(recordId, userId, emoji) {
        const sql = `
            INSERT INTO reactions (record_id, user_id, emoji)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                emoji = VALUES(emoji),
                created_at = CURRENT_TIMESTAMP
        `;
        await db.query(sql, [recordId, userId, emoji]);
        return true;
    }

    /**
     * タイムライン用: 指定レコード群に対する特定ユーザーのリアクションを一括取得
     * @returns {Object} recordId -> emoji
     */
    static async getMyReactionsForRecords(userId, recordIds) {
        if (!recordIds || recordIds.length === 0) return {};
        const placeholders = recordIds.map(() => '?').join(',');
        const sql = `
            SELECT record_id, emoji
            FROM reactions
            WHERE user_id = ? AND record_id IN (${placeholders})
        `;
        const [rows] = await db.query(sql, [userId, ...recordIds]);
        const map = {};
        for (const row of rows) map[row.record_id] = row.emoji;
        return map;
    }

    /**
     * 投稿者向け: emoji ごとの件数を集計
     * @returns {Array<{emoji: string, count: number}>}
     */
    static async getReactionSummary(recordId) {
        const sql = `
            SELECT emoji, COUNT(*) AS count
            FROM reactions
            WHERE record_id = ?
            GROUP BY emoji
            ORDER BY count DESC, emoji
        `;
        const [rows] = await db.query(sql, [recordId]);
        return rows;
    }

    /**
     * 投稿者向け: 誰がどの絵文字でリアクションしたかの詳細一覧
     * @returns {Array<{emoji: string, user_id: number, user_name: string, avatar_url: string|null, created_at: string}>}
     */
    static async getReactionDetails(recordId) {
        const sql = `
            SELECT r.emoji, r.created_at,
                   u.id AS user_id, u.user_name,
                   ua.image_url AS avatar_url
            FROM reactions r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            WHERE r.record_id = ?
            ORDER BY r.emoji, r.created_at DESC
        `;
        const [rows] = await db.query(sql, [recordId]);
        return rows;
    }
}

module.exports = ReactionModel;
