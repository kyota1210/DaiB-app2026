const db = require('../db');

class RecordModel {
    /**
     * 特定ユーザーの全記録を取得
     */
    static async findAllByUserId(userId, categoryId = null) {
        let sql = `
            SELECT r.id, r.title, r.description, r.created_at, r.date_logged, r.image_url, r.category_id,
                   r.aspect_ratio, r.zoom_level, r.position_x, r.position_y,
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
                   r.aspect_ratio, r.zoom_level, r.position_x, r.position_y,
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
    static async create({ userId, title, description, dateLogged, imageUrl, categoryId, aspectRatio, zoomLevel, positionX, positionY }) {
        const sql = `
            INSERT INTO records (user_id, title, description, date_logged, invalidation_flag, image_url, category_id, aspect_ratio, zoom_level, position_x, position_y) 
            VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [
            userId, 
            title, 
            description, 
            dateLogged, 
            imageUrl, 
            categoryId || null,
            aspectRatio || '1:1',
            zoomLevel || 1.0,
            positionX || 0,
            positionY || 0
        ]);
        return result.insertId;
    }

    /**
     * 記録を更新（IDと所有者を確認）
     */
    static async update(id, userId, { title, description, categoryId, dateLogged, imageUrl, aspectRatio, zoomLevel, positionX, positionY }) {
        let sql = 'UPDATE records SET title = ?, description = ?, category_id = ?, date_logged = ?, aspect_ratio = ?, zoom_level = ?, position_x = ?, position_y = ?';
        const params = [
            title, 
            description, 
            categoryId || null, 
            dateLogged, 
            aspectRatio || '1:1',
            zoomLevel !== undefined ? zoomLevel : 1.0,
            positionX !== undefined ? positionX : 0,
            positionY !== undefined ? positionY : 0
        ];

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
}

module.exports = RecordModel;
