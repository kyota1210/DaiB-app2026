const db = require('../db');
const crypto = require('crypto');

const SEARCH_KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
const SEARCH_KEY_RANDOM_LEN = 20;

function normalizeNfkc(s) {
    try {
        return String(s || '').normalize('NFKC');
    } catch {
        return String(s || '');
    }
}

function toHiragana(s) {
    // カタカナ(ァ-ヶ) → ひらがな(ぁ-ゖ) は +0x60
    return Array.from(String(s || '')).map((ch) => {
        const code = ch.codePointAt(0);
        if (code == null) return ch;
        if (code >= 0x30A1 && code <= 0x30F6) return String.fromCodePoint(code - 0x60);
        return ch;
    }).join('');
}

function toKatakana(s) {
    // ひらがな(ぁ-ゖ) → カタカナ(ァ-ヶ) は -0x60
    return Array.from(String(s || '')).map((ch) => {
        const code = ch.codePointAt(0);
        if (code == null) return ch;
        if (code >= 0x3041 && code <= 0x3096) return String.fromCodePoint(code + 0x60);
        return ch;
    }).join('');
}

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
        const sql = 'SELECT id, user_name, email, bio, default_view_mode, default_sort_order, visibility, search_key FROM users WHERE id = ?';
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
     * 一覧のデフォルト表示形式を更新
     * @param {number} id - ユーザーID
     * @param {string} defaultViewMode - 'grid' | 'list' | 'booklist' | 'tile'
     */
    static async updateDefaultViewMode(id, defaultViewMode) {
        const valid = ['grid', 'list', 'booklist', 'tile'].includes(defaultViewMode);
        const mode = valid ? defaultViewMode : 'grid';
        const sql = 'UPDATE users SET default_view_mode = ? WHERE id = ?';
        const [result] = await db.query(sql, [mode, id]);
        return result.affectedRows;
    }

    /**
     * 一覧のデフォルト並び順を更新
     * @param {number} id - ユーザーID
     * @param {string} defaultSortOrder - 'date_logged' | 'created_at'
     */
    static async updateDefaultSortOrder(id, defaultSortOrder) {
        const valid = ['date_logged', 'created_at'].includes(defaultSortOrder);
        const order = valid ? defaultSortOrder : 'date_logged';
        const sql = 'UPDATE users SET default_sort_order = ? WHERE id = ?';
        const [result] = await db.query(sql, [order, id]);
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
     * パスワードを更新（パスワードリセット用）
     * @param {number} userId
     * @param {string} passwordHash - bcrypt 済みハッシュ
     */
    static async updatePassword(userId, passwordHash) {
        const sql = 'UPDATE users SET password_hash = ? WHERE id = ?';
        const [result] = await db.query(sql, [passwordHash, userId]);
        return result.affectedRows;
    }

    /**
     * リセット用トークンのハッシュを計算（照合用）
     * @param {string} plainToken
     * @returns {string}
     */
    static hashResetToken(plainToken) {
        return crypto.createHash('sha256').update(plainToken, 'utf8').digest('hex');
    }

    /**
     * パスワードリセット用トークンを作成し、DB に保存する
     * @param {number} userId
     * @param {number} expiresInMinutes - 有効期限（分）
     * @returns {{ token: string, expiresAt: Date }}
     */
    static async createPasswordResetToken(userId, expiresInMinutes = 60) {
        const plainToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashResetToken(plainToken);
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        const sql = 'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)';
        await db.query(sql, [userId, tokenHash, expiresAt]);
        return { token: plainToken, expiresAt };
    }

    /**
     * 有効なリセットトークンから user_id を取得
     * @param {string} plainToken
     * @returns {Promise<number|undefined>} userId または undefined
     */
    static async findValidResetToken(plainToken) {
        const tokenHash = this.hashResetToken(plainToken);
        const sql = 'SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1';
        const [rows] = await db.query(sql, [tokenHash]);
        return rows[0] ? rows[0].user_id : undefined;
    }

    /**
     * リセットトークンを無効化（削除）
     * @param {string} plainToken
     */
    static async invalidateResetToken(plainToken) {
        const tokenHash = this.hashResetToken(plainToken);
        const sql = 'DELETE FROM password_reset_tokens WHERE token_hash = ?';
        await db.query(sql, [tokenHash]);
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

        // ひらがな/カタカナ・英字大小の揺れを吸収するため、クエリ側を複数パターンでLIKE検索する。
        // DB側に正規化済みカラムがない前提のため、ユーザー名検索は user_name のみ対象にする。
        const qN = normalizeNfkc(q);
        const qH = toHiragana(qN);
        const qK = toKatakana(qN);
        const qL = qN.toLowerCase();
        const qHL = qH.toLowerCase();
        const qKL = qK.toLowerCase();

        const likeQ = `%${q}%`;
        const likeH = `%${qH}%`;
        const likeK = `%${qK}%`;
        const likeL = `%${qL}%`;
        const likeHL = `%${qHL}%`;
        const likeKL = `%${qKL}%`;

        const sql = `
            SELECT u.id, u.user_name, u.bio, u.visibility
            FROM users u
            WHERE u.id != ?
            AND (
                (
                    u.visibility = 'public'
                    AND (
                        u.user_name LIKE ?
                        OR u.user_name LIKE ?
                        OR u.user_name LIKE ?
                        OR LOWER(u.user_name) LIKE ?
                        OR LOWER(u.user_name) LIKE ?
                        OR LOWER(u.user_name) LIKE ?
                    )
                )
                OR (u.visibility = 'private' AND u.search_key = ?)
            )
            LIMIT ?
        `;
        const [rows] = await db.query(sql, [
            viewerId,
            likeQ,
            likeH,
            likeK,
            likeL,
            likeHL,
            likeKL,
            q,
            limit,
        ]);
        return rows;
    }
}

module.exports = UserModel;
