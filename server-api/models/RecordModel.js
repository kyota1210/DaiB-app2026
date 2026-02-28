const db = require('../db');

class RecordModel {
    /**
     * 特定ユーザーの全記録を取得
     */
    static async findAllByUserId(userId, categoryId = null) {
        let sql = `
            SELECT r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id,
                   c.name as category_name
            FROM records r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.user_id = ? AND r.invalidation_flag = 0
        `;
        const params = [userId];
        
        // カテゴリーフィルタリング
        if (categoryId !== null) {
            sql += ' AND r.category_id = ?';
            params.push(categoryId);
        }
        
        sql += ' ORDER BY r.created_at DESC';
        
        const [rows] = await db.query(sql, params);
        return rows;
    }

    /**
     * 特定の記録を取得
     */
    static async findById(id, userId) {
        const sql = `
            SELECT r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id,
                   c.name as category_name
            FROM records r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.id = ? AND r.user_id = ? AND r.invalidation_flag = 0
        `;
        const [rows] = await db.query(sql, [id, userId]);
        return rows[0];
    }

    /**
     * 新しい記録を作成
     */
    static async create({ userId, title, description, dateLogged, imageUrl, categoryId }) {
        const sql = `
            INSERT INTO records (user_id, title, description, date_logged, invalidation_flag, image_url, category_id) 
            VALUES (?, ?, ?, ?, 0, ?, ?)
        `;
        const [result] = await db.query(sql, [
            userId,
            title,
            description,
            dateLogged,
            imageUrl,
            categoryId || null
        ]);
        return result.insertId;
    }

    /**
     * 記録を更新（IDと所有者を確認）
     */
    static async update(id, userId, { title, description, categoryId, dateLogged, imageUrl }) {
        let sql = 'UPDATE records SET title = ?, description = ?, category_id = ?, date_logged = ?';
        const params = [title, description, categoryId || null, dateLogged];

        if (imageUrl) {
            sql += ', image_url = ?';
            params.push(imageUrl);
        }

        sql += ' WHERE id = ? AND user_id = ?';
        params.push(id, userId);

        const [result] = await db.query(sql, params);
        return result.affectedRows > 0;
    }

    /**
     * 記録を論理削除（IDと所有者を確認）
     */
    static async softDelete(id, userId) {
        const sql = `
            UPDATE records 
            SET invalidation_flag = 1, delete_at = NOW() 
            WHERE id = ? AND user_id = ?
        `;
        const [result] = await db.query(sql, [id, userId]);
        return result.affectedRows > 0;
    }

    /**
     * タイムライン用: 指定ユーザー群の直近7日間の記録を取得（投稿者情報付き）
     * @param {number[]} authorIds - 投稿者ユーザーIDの配列
     */
    static async findTimelineByAuthorIds(authorIds) {
        if (!authorIds || authorIds.length === 0) return [];
        const placeholders = authorIds.map(() => '?').join(',');
        const sql = `
            SELECT r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id, r.user_id AS author_id,
                   u.user_name AS author_name,
                   ua.image_url AS author_avatar_url,
                   c.name AS category_name
            FROM records r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            LEFT JOIN categories c ON c.id = r.category_id
            WHERE r.user_id IN (${placeholders})
              AND r.invalidation_flag = 0
              AND r.created_at >= NOW() - INTERVAL 7 DAY
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.query(sql, authorIds);
        return rows;
    }
}

module.exports = RecordModel;
