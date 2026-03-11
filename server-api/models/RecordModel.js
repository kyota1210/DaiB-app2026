const db = require('../db');

class RecordModel {
    /**
     * 特定ユーザーの全記録を取得
     * category_ids: カンマ区切り文字列（クライアント側で配列に変換）
     */
    static async findAllByUserId(userId, categoryId = null) {
        let sql = `
            SELECT r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id, r.show_in_timeline,
                   GROUP_CONCAT(rc.category_id ORDER BY rc.category_id SEPARATOR ',') AS category_ids,
                   GROUP_CONCAT(c.name ORDER BY rc.category_id SEPARATOR ',') AS category_names
            FROM records r
            LEFT JOIN record_categories rc ON rc.record_id = r.id
            LEFT JOIN categories c ON c.id = rc.category_id
            WHERE r.user_id = ? AND r.invalidation_flag = 0
        `;
        const params = [userId];

        if (categoryId !== null) {
            sql += ' AND r.id IN (SELECT record_id FROM record_categories WHERE category_id = ?)';
            params.push(categoryId);
        }

        sql += ' GROUP BY r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id, r.show_in_timeline';
        sql += ' ORDER BY r.created_at DESC';

        const [rows] = await db.query(sql, params);
        return rows;
    }

    /**
     * 特定の記録を取得
     */
    static async findById(id, userId) {
        const sql = `
            SELECT r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id, r.show_in_timeline,
                   GROUP_CONCAT(rc.category_id ORDER BY rc.category_id SEPARATOR ',') AS category_ids,
                   GROUP_CONCAT(c.name ORDER BY rc.category_id SEPARATOR ',') AS category_names
            FROM records r
            LEFT JOIN record_categories rc ON rc.record_id = r.id
            LEFT JOIN categories c ON c.id = rc.category_id
            WHERE r.id = ? AND r.user_id = ? AND r.invalidation_flag = 0
            GROUP BY r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id, r.show_in_timeline
        `;
        const [rows] = await db.query(sql, [id, userId]);
        return rows[0];
    }

    /**
     * 新しい記録を作成
     * categoryIds: number[] （複数カテゴリ対応）
     */
    static async create({ userId, title, description, dateLogged, imageUrl, categoryIds, showInTimeline = 1 }) {
        const primaryCategoryId = categoryIds && categoryIds.length > 0 ? categoryIds[0] : null;

        const sql = `
            INSERT INTO records (user_id, title, description, date_logged, invalidation_flag, image_url, category_id, show_in_timeline, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        const [result] = await db.query(sql, [
            userId,
            title,
            description,
            dateLogged,
            imageUrl,
            primaryCategoryId,
            showInTimeline ? 1 : 0
        ]);
        const recordId = result.insertId;

        if (categoryIds && categoryIds.length > 0) {
            const values = categoryIds.map(cid => [recordId, cid]);
            await db.query('INSERT IGNORE INTO record_categories (record_id, category_id) VALUES ?', [values]);
        }

        return recordId;
    }

    /**
     * 記録を更新（IDと所有者を確認）
     * categoryIds: number[]
     */
    static async update(id, userId, { title, description, categoryIds, dateLogged, imageUrl, showInTimeline }) {
        const primaryCategoryId = categoryIds && categoryIds.length > 0 ? categoryIds[0] : null;

        let sql = 'UPDATE records SET title = ?, description = ?, category_id = ?, date_logged = ?, updated_at = CURRENT_TIMESTAMP';
        const params = [title, description, primaryCategoryId, dateLogged];

        if (imageUrl) {
            sql += ', image_url = ?';
            params.push(imageUrl);
        }
        if (showInTimeline !== undefined) {
            sql += ', show_in_timeline = ?';
            params.push(showInTimeline ? 1 : 0);
        }

        sql += ' WHERE id = ? AND user_id = ?';
        params.push(id, userId);

        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) return false;

        // 中間テーブルを洗い替え
        await db.query('DELETE FROM record_categories WHERE record_id = ?', [id]);
        if (categoryIds && categoryIds.length > 0) {
            const values = categoryIds.map(cid => [id, cid]);
            await db.query('INSERT IGNORE INTO record_categories (record_id, category_id) VALUES ?', [values]);
        }

        return true;
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
     */
    static async findTimelineByAuthorIds(authorIds) {
        if (!authorIds || authorIds.length === 0) return [];
        const placeholders = authorIds.map(() => '?').join(',');
        const sql = `
            SELECT r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id, r.user_id AS author_id,
                   u.user_name AS author_name,
                   ua.image_url AS author_avatar_url,
                   GROUP_CONCAT(rc.category_id ORDER BY rc.category_id SEPARATOR ',') AS category_ids,
                   GROUP_CONCAT(c.name ORDER BY rc.category_id SEPARATOR ',') AS category_names
            FROM records r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN user_avatars ua ON ua.user_id = u.id
            LEFT JOIN record_categories rc ON rc.record_id = r.id
            LEFT JOIN categories c ON c.id = rc.category_id
            WHERE r.user_id IN (${placeholders})
              AND r.invalidation_flag = 0
              AND r.show_in_timeline = 1
              AND r.created_at >= NOW() - INTERVAL 7 DAY
            GROUP BY r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id, r.user_id,
                     u.user_name, ua.image_url
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.query(sql, authorIds);
        return rows;
    }
}

module.exports = RecordModel;
