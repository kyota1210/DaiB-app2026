const db = require('../db');
const UserModel = require('../models/UserModel');

/**
 * 非公開ユーザーで search_key が未設定のユーザーに検索キーを付与する。
 * 検索キーは userId_ランダム 形式で一意。
 */
async function run() {
    try {
        const [rows] = await db.query(`
            SELECT id FROM users
            WHERE visibility = 'private' AND (search_key IS NULL OR search_key = '')
        `);
        for (const row of rows) {
            const key = UserModel.generateSearchKey(row.id);
            await db.query('UPDATE users SET search_key = ? WHERE id = ?', [key, row.id]);
            console.log(`  user id=${row.id} に検索キーを設定しました`);
        }
        console.log(`✅ ${rows.length} 件のユーザーに検索キーを設定しました`);
    } catch (error) {
        console.error('❌ 検索キー付与に失敗しました:', error);
        throw error;
    } finally {
        process.exit();
    }
}

run();
