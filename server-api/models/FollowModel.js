const db = require('../db');

class FollowModel {
    /**
     * フォロー関係を作成（同一ペアが論理削除済みなら復活）
     * @param {number} followerId - フォローする側（自分）
     * @param {number} followingId - フォローされる側（相手）
     */
    static async create(followerId, followingId) {
        if (followerId === followingId) return null;

        const [rows] = await db.query(
            `SELECT id, invalidation_flag FROM follows WHERE follower_id = ? AND following_id = ?`,
            [followerId, followingId]
        );
        if (rows.length > 0) {
            const row = rows[0];
            if (row.invalidation_flag === 1) {
                await db.query(
                    `UPDATE follows SET invalidation_flag = 0, deleted_at = NULL WHERE id = ?`,
                    [row.id]
                );
                return row.id;
            }
            return row.id;
        }

        const [result] = await db.query(
            'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
            [followerId, followingId]
        );
        return result.insertId;
    }

    /**
     * フォロー解除（論理削除）
     */
    static async delete(followerId, followingId) {
        const sql = `
            UPDATE follows
            SET invalidation_flag = 1,
                deleted_at = CURRENT_TIMESTAMP
            WHERE follower_id = ? AND following_id = ? AND invalidation_flag = 0
        `;
        const [result] = await db.query(sql, [followerId, followingId]);
        return result.affectedRows > 0;
    }

    /**
     * フォロー中かどうか（有効なレコードのみ）
     */
    static async isFollowing(followerId, followingId) {
        const sql =
            'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND invalidation_flag = 0';
        const [rows] = await db.query(sql, [followerId, followingId]);
        return rows.length > 0;
    }

    /**
     * フォロー数を取得（相互フォロー＝友だちを除く）
     */
    static async getFollowingCount(userId) {
        const sql = `
            SELECT COUNT(*) AS cnt FROM follows f
            WHERE f.follower_id = ?
            AND f.invalidation_flag = 0
            AND NOT EXISTS (
                SELECT 1 FROM follows f2
                WHERE f2.follower_id = f.following_id AND f2.following_id = f.follower_id
                AND f2.invalidation_flag = 0
            )
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows[0] ? Number(rows[0].cnt) : 0;
    }

    /**
     * フォロワー数を取得（相互フォロー＝友だちを除く）
     */
    static async getFollowerCount(userId) {
        const sql = `
            SELECT COUNT(*) AS cnt FROM follows f
            WHERE f.following_id = ?
            AND f.invalidation_flag = 0
            AND NOT EXISTS (
                SELECT 1 FROM follows f2
                WHERE f2.follower_id = f.following_id AND f2.following_id = f.follower_id
                AND f2.invalidation_flag = 0
            )
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows[0] ? Number(rows[0].cnt) : 0;
    }

    /**
     * フォロー中一覧（相互フォロー＝友だちを除く）
     */
    static async getFollowingList(userId) {
        const sql = `
            SELECT u.id, u.user_name, u.bio,
                   ua.image_url AS avatar_url
            FROM follows f
            JOIN users u ON u.id = f.following_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            WHERE f.follower_id = ?
            AND f.invalidation_flag = 0
            AND NOT EXISTS (
                SELECT 1 FROM follows f2
                WHERE f2.follower_id = f.following_id AND f2.following_id = f.follower_id
                AND f2.invalidation_flag = 0
            )
            ORDER BY f.created_at DESC
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * フォロワー一覧（相互フォロー＝友だちを除く）
     */
    static async getFollowersList(userId) {
        const sql = `
            SELECT u.id, u.user_name, u.bio,
                   ua.image_url AS avatar_url
            FROM follows f
            JOIN users u ON u.id = f.follower_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            WHERE f.following_id = ?
            AND f.invalidation_flag = 0
            AND NOT EXISTS (
                SELECT 1 FROM follows f2
                WHERE f2.follower_id = f.following_id AND f2.following_id = f.follower_id
                AND f2.invalidation_flag = 0
            )
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
        const sql = `SELECT following_id FROM follows WHERE follower_id = ? AND following_id IN (${placeholders}) AND invalidation_flag = 0`;
        const [rows] = await db.query(sql, [viewerId, ...userIds]);
        return new Set(rows.map((r) => r.following_id));
    }

    /**
     * userIds のうち誰が viewerId をフォローしているか
     * @returns {Promise<Set<number>>} viewerId をフォローしている id の Set
     */
    static async getFollowedByStatusSet(viewerId, userIds) {
        if (!userIds || userIds.length === 0) return new Set();
        const placeholders = userIds.map(() => '?').join(',');
        const sql = `SELECT follower_id FROM follows WHERE following_id = ? AND follower_id IN (${placeholders}) AND invalidation_flag = 0`;
        const [rows] = await db.query(sql, [viewerId, ...userIds]);
        return new Set(rows.map((r) => r.follower_id));
    }

    /**
     * userIds のうち viewerId と友だち（相互フォロー）なのは誰か
     * @returns {Promise<Set<number>>}
     */
    static async getFriendStatusSet(viewerId, userIds) {
        if (!userIds || userIds.length === 0) return new Set();
        const placeholders = userIds.map(() => '?').join(',');
        const sql = `
            SELECT f1.following_id
            FROM follows f1
            JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
            WHERE f1.follower_id = ? AND f1.following_id IN (${placeholders})
            AND f1.invalidation_flag = 0 AND f2.invalidation_flag = 0
        `;
        const [rows] = await db.query(sql, [viewerId, ...userIds]);
        return new Set(rows.map((r) => r.following_id));
    }

    /**
     * 友だち一覧（相互フォロー中のユーザー情報付き）
     */
    static async getFriendsList(userId) {
        const sql = `
            SELECT u.id, u.user_name, u.bio,
                   ua.image_url AS avatar_url
            FROM follows f1
            JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
            JOIN users u ON u.id = f1.following_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            WHERE f1.follower_id = ?
            AND f1.invalidation_flag = 0 AND f2.invalidation_flag = 0
            ORDER BY f1.created_at DESC
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * 友だち数（相互フォロー数）を取得
     */
    static async getFriendsCount(userId) {
        const sql = `
            SELECT COUNT(*) AS cnt
            FROM follows f1
            JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
            WHERE f1.follower_id = ?
            AND f1.invalidation_flag = 0 AND f2.invalidation_flag = 0
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows[0] ? Number(rows[0].cnt) : 0;
    }

    /**
     * 2ユーザーが友だち（相互フォロー）かどうか
     */
    static async isFriend(userId1, userId2) {
        const sql = `
            SELECT 1 FROM follows f1
            JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
            WHERE f1.follower_id = ? AND f1.following_id = ?
            AND f1.invalidation_flag = 0 AND f2.invalidation_flag = 0
        `;
        const [rows] = await db.query(sql, [userId1, userId2]);
        return rows.length > 0;
    }
}

module.exports = FollowModel;
