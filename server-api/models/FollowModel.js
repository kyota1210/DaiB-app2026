const db = require('../db');

class FollowModel {
    /**
     * フォロー関係を作成
     * @param {number} followerId - フォローする側（自分）
     * @param {number} followingId - フォローされる側（相手）
     */
    static async create(followerId, followingId) {
        if (followerId === followingId) return null;
        const sql = 'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)';
        const [result] = await db.query(sql, [followerId, followingId]);
        return result.insertId;
    }

    /**
     * フォロー解除
     */
    static async delete(followerId, followingId) {
        const sql = 'DELETE FROM follows WHERE follower_id = ? AND following_id = ?';
        const [result] = await db.query(sql, [followerId, followingId]);
        return result.affectedRows > 0;
    }

    /**
     * フォロー中かどうか
     */
    static async isFollowing(followerId, followingId) {
        const sql = 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?';
        const [rows] = await db.query(sql, [followerId, followingId]);
        return rows.length > 0;
    }

    /**
     * フォロー数を取得
     */
    static async getFollowingCount(userId) {
        const sql = 'SELECT COUNT(*) AS cnt FROM follows WHERE follower_id = ?';
        const [rows] = await db.query(sql, [userId]);
        return rows[0] ? Number(rows[0].cnt) : 0;
    }

    /**
     * フォロワー数を取得
     */
    static async getFollowerCount(userId) {
        const sql = 'SELECT COUNT(*) AS cnt FROM follows WHERE following_id = ?';
        const [rows] = await db.query(sql, [userId]);
        return rows[0] ? Number(rows[0].cnt) : 0;
    }

    /**
     * フォロー中一覧（ユーザー情報付き）
     */
    static async getFollowingList(userId) {
        const sql = `
            SELECT u.id, u.user_name, u.bio, u.visibility,
                   ua.image_url AS avatar_url
            FROM follows f
            JOIN users u ON u.id = f.following_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            WHERE f.follower_id = ?
            ORDER BY f.created_at DESC
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * フォロワー一覧（ユーザー情報付き）
     */
    static async getFollowersList(userId) {
        const sql = `
            SELECT u.id, u.user_name, u.bio, u.visibility,
                   ua.image_url AS avatar_url
            FROM follows f
            JOIN users u ON u.id = f.follower_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            WHERE f.following_id = ?
            ORDER BY f.created_at DESC
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * viewerId が userIds のうち誰をフォローしているか
     * @returns {Promise<Set<number>>} フォローしている id の Set
     */
    static async getFollowingStatusSet(viewerId, userIds) {
        if (!userIds || userIds.length === 0) return new Set();
        const placeholders = userIds.map(() => '?').join(',');
        const sql = `SELECT following_id FROM follows WHERE follower_id = ? AND following_id IN (${placeholders})`;
        const [rows] = await db.query(sql, [viewerId, ...userIds]);
        return new Set(rows.map((r) => r.following_id));
    }
}

module.exports = FollowModel;
