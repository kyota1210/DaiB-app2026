const db = require('../db');
const crypto = require('crypto');

const SEARCH_KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
const SEARCH_KEY_RANDOM_LEN = 20;

class UserModel {
    /**
     * 検索キーを生成（ユーザーID + ランダム値で一意）
     * @param {number} userId - ユーザーID
     * @returns {string} 例: "123_a1B2c3D4e5F6g7H8i9J0"
     */
    static generateSearchKey(userId) {
        const bytes = crypto.randomBytes(SEARCH_KEY_RANDOM_LEN);
        let s = '';
        for (let i = 0; i < SEARCH_KEY_RANDOM_LEN; i++) s += SEARCH_KEY_CHARS[bytes[i] % SEARCH_KEY_CHARS.length];
        return `${userId}_${s}`;
    }
    /**
     * IDでユーザーを検索
     * @param {number} id 
     */
    static async findById(id) {
        const sql = 'SELECT id, user_name, email, bio, visibility, search_key FROM users WHERE id = ?';
        const [rows] = await db.query(sql, [id]);
        return rows[0]; // ユーザーが見つかればオブジェクト、なければundefinedを返す
    }

    /**
     * メールアドレスでユーザーを検索
     * @param {string} email 
     */
    static async findByEmail(email) {
        const sql = 'SELECT id, password_hash, user_name, email FROM users WHERE email = ?';
        const [rows] = await db.query(sql, [email]);
        return rows[0]; // ユーザーが見つかればオブジェクト、なければundefinedを返す
    }

    /**
     * 新しいユーザーを作成
     * @param {Object} userData
     * @param {string} userData.email
     * @param {string} userData.userName
     * @param {string} userData.passwordHash
     */
    static async create({ email, userName, passwordHash }) {
        const sql = 'INSERT INTO users (email, user_name, password_hash) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [email, userName, passwordHash]);
        return result.insertId;
    }

    /**
     * ユーザー名を更新
     * @param {number} id 
     * @param {string} userName 
     */
    static async updateUserName(id, userName) {
        const sql = 'UPDATE users SET user_name = ? WHERE id = ?';
        const [result] = await db.query(sql, [userName, id]);
        return result.affectedRows;
    }

    /**
     * 自己紹介を更新
     * @param {number} id 
     * @param {string} bio 
     */
    static async updateBio(id, bio) {
        const sql = 'UPDATE users SET bio = ? WHERE id = ?';
        const [result] = await db.query(sql, [bio, id]);
        return result.affectedRows;
    }

    /**
     * 公開設定を更新
     * @param {number} id
     * @param {string} visibility - 'public' | 'private'
     * @param {string|null} searchKey - 非公開時の検索キー
     */
    static async updateVisibility(id, visibility, searchKey = null) {
        const sql = 'UPDATE users SET visibility = ?, search_key = ? WHERE id = ?';
        const [result] = await db.query(sql, [visibility, searchKey || null, id]);
        return result.affectedRows;
    }

    /**
     * 検索: 公開ユーザーは user_name 等で部分一致、非公開は search_key 完全一致時のみ
     * @param {string} query - 検索文字列
     * @param {number} viewerId - 検索実行者（自分は結果から除外）
     * @param {number} limit
     */
    static async search(query, viewerId, limit = 50) {
        const q = (query || '').trim();
        if (!q) return [];
        const like = `%${q}%`;
        const sql = `
            SELECT u.id, u.user_name, u.bio, u.visibility
            FROM users u
            WHERE u.id != ?
            AND (
                (u.visibility = 'public' AND (u.user_name LIKE ? OR u.bio LIKE ?))
                OR (u.visibility = 'private' AND u.search_key = ?)
                OR (u.search_key = ?)
            )
            LIMIT ?
        `;
        const [rows] = await db.query(sql, [viewerId, like, like, q, q, limit]);
        return rows;
    }
}

module.exports = UserModel;
