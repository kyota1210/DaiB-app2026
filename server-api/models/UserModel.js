const db = require('../db');

class UserModel {
    /**
     * IDでユーザーを検索
     * @param {number} id 
     */
    static async findById(id) {
        const sql = 'SELECT id, user_name, email, bio FROM users WHERE id = ?';
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
}

module.exports = UserModel;
