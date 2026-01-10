const db = require('../db');

class CategoryModel {
    /**
     * 特定ユーザーの全カテゴリーを取得
     */
    static async findAllByUserId(userId) {
        const sql = `
            SELECT c.id, c.name, c.icon, c.color, c.created_at, c.updated_at,
                   ci.image_url
            FROM categories c
            LEFT JOIN category_images ci ON c.id = ci.category_id
            WHERE c.user_id = ? 
            ORDER BY c.created_at ASC
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * 特定カテゴリーを取得（所有者確認付き）
     */
    static async findById(id, userId) {
        const sql = `
            SELECT c.id, c.name, c.icon, c.color, c.created_at, c.updated_at,
                   ci.image_url
            FROM categories c
            LEFT JOIN category_images ci ON c.id = ci.category_id
            WHERE c.id = ? AND c.user_id = ?
        `;
        const [rows] = await db.query(sql, [id, userId]);
        return rows[0];
    }

    /**
     * 新しいカテゴリーを作成
     */
    static async create({ userId, name, icon, color }) {
        const sql = `
            INSERT INTO categories (user_id, name, icon, color) 
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [userId, name, icon, color]);
        return result.insertId;
    }

    /**
     * カテゴリーを更新（IDと所有者を確認）
     */
    static async update(id, userId, { name, icon, color }) {
        const sql = `
            UPDATE categories 
            SET name = ?, icon = ?, color = ? 
            WHERE id = ? AND user_id = ?
        `;
        const [result] = await db.query(sql, [name, icon, color, id, userId]);
        return result.affectedRows > 0;
    }

    /**
     * カテゴリーを削除（IDと所有者を確認）
     */
    static async delete(id, userId) {
        const sql = `
            DELETE FROM categories 
            WHERE id = ? AND user_id = ?
        `;
        const [result] = await db.query(sql, [id, userId]);
        return result.affectedRows > 0;
    }
}

module.exports = CategoryModel;
