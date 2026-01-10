const db = require('../db');

class CategoryImageModel {
    /**
     * カテゴリIDから画像URLを取得
     */
    static async findByCategoryId(categoryId) {
        const sql = `
            SELECT id, category_id, image_url, created_at, updated_at 
            FROM category_images 
            WHERE category_id = ?
        `;
        const [rows] = await db.query(sql, [categoryId]);
        return rows[0];
    }

    /**
     * ユーザーの全カテゴリ画像を取得
     */
    static async findByUserId(userId) {
        const sql = `
            SELECT ci.id, ci.category_id, ci.image_url, ci.created_at, ci.updated_at 
            FROM category_images ci
            INNER JOIN categories c ON ci.category_id = c.id
            WHERE c.user_id = ?
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * 新規画像登録
     */
    static async create(categoryId, imageUrl) {
        const sql = `
            INSERT INTO category_images (category_id, image_url) 
            VALUES (?, ?)
        `;
        const [result] = await db.query(sql, [categoryId, imageUrl]);
        return result.insertId;
    }

    /**
     * 画像URL更新
     */
    static async update(categoryId, imageUrl) {
        const sql = `
            UPDATE category_images 
            SET image_url = ? 
            WHERE category_id = ?
        `;
        const [result] = await db.query(sql, [imageUrl, categoryId]);
        return result.affectedRows > 0;
    }

    /**
     * 画像削除
     */
    static async delete(categoryId) {
        const sql = `
            DELETE FROM category_images 
            WHERE category_id = ?
        `;
        const [result] = await db.query(sql, [categoryId]);
        return result.affectedRows > 0;
    }
}

module.exports = CategoryImageModel;

