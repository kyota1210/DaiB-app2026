const db = require('../db');

class CategoryModel {
    /**
     * 特定ユーザーの全カテゴリーを取得（表示順。sort_order が無い場合は id 順）
     */
    static async findAllByUserId(userId) {
        const sqlWithSort = `
            SELECT id, name, sort_order, created_at, updated_at
            FROM categories
            WHERE user_id = ?
            ORDER BY sort_order ASC, id ASC
        `;
        try {
            const [rows] = await db.query(sqlWithSort, [userId]);
            return rows;
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' && err.message && err.message.includes('sort_order')) {
                const sqlFallback = `
                    SELECT id, name, created_at, updated_at
                    FROM categories
                    WHERE user_id = ?
                    ORDER BY id ASC
                `;
                const [rows] = await db.query(sqlFallback, [userId]);
                return rows;
            }
            throw err;
        }
    }

    /**
     * 特定カテゴリーを取得（所有者確認付き）
     */
    static async findById(id, userId) {
        try {
            const [rows] = await db.query(
                'SELECT id, name, sort_order, created_at, updated_at FROM categories WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            return rows[0];
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' && err.message && err.message.includes('sort_order')) {
                const [rows] = await db.query(
                    'SELECT id, name, created_at, updated_at FROM categories WHERE id = ? AND user_id = ?',
                    [id, userId]
                );
                return rows[0];
            }
            throw err;
        }
    }

    /**
     * 新しいカテゴリーを作成（sort_order があれば末尾に追加、無ければ name のみ）
     */
    static async create({ userId, name }) {
        try {
            const [[{ maxOrder }]] = await db.query(
                'SELECT COALESCE(MAX(sort_order), -1) + 1 AS maxOrder FROM categories WHERE user_id = ?',
                [userId]
            );
            const [result] = await db.query(
                'INSERT INTO categories (user_id, name, sort_order) VALUES (?, ?, ?)',
                [userId, name, maxOrder]
            );
            return result.insertId;
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' && err.message && err.message.includes('sort_order')) {
                const [result] = await db.query(
                    'INSERT INTO categories (user_id, name) VALUES (?, ?)',
                    [userId, name]
                );
                return result.insertId;
            }
            throw err;
        }
    }

    /**
     * カテゴリーを更新（IDと所有者を確認）
     */
    static async update(id, userId, { name, sort_order: sortOrder }) {
        const updates = ['name = ?'];
        const params = [name];
        if (sortOrder !== undefined) {
            updates.push('sort_order = ?');
            params.push(sortOrder);
        }
        params.push(id, userId);
        const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
        try {
            const [result] = await db.query(sql, params);
            return result.affectedRows > 0;
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' && sortOrder !== undefined) {
                const [result] = await db.query(
                    'UPDATE categories SET name = ? WHERE id = ? AND user_id = ?',
                    [name, id, userId]
                );
                return result.affectedRows > 0;
            }
            throw err;
        }
    }

    /**
     * カテゴリーの並び順を一括更新（category_ids の並びが新しい表示順）。sort_order が無い場合は何もしない。
     */
    static async reorder(userId, categoryIds) {
        if (!Array.isArray(categoryIds) || categoryIds.length === 0) return true;
        try {
            for (let i = 0; i < categoryIds.length; i++) {
                const [result] = await db.query(
                    'UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?',
                    [i, categoryIds[i], userId]
                );
                if (result.affectedRows === 0) return false;
            }
            return true;
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' && err.message && err.message.includes('sort_order')) {
                return true;
            }
            throw err;
        }
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
