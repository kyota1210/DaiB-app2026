/**
 * Supabase Auth 連携: users に supabase_user_id を追加し、password_hash を NULL 許可にする。
 * 実行: node server-api/scripts/alter_users_supabase_auth.js
 */
const db = require('../db');

async function columnExists(table, column) {
    const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    return rows.length > 0;
}

async function run() {
    try {
        if (!(await columnExists('users', 'supabase_user_id'))) {
            await db.query(`
                ALTER TABLE users
                ADD COLUMN supabase_user_id VARCHAR(36) NULL UNIQUE COMMENT 'auth.users の UUID'
            `);
            console.log('✅ users.supabase_user_id を追加しました。');
        } else {
            console.log('users.supabase_user_id は既に存在します。スキップします。');
        }

        await db.query(`
            ALTER TABLE users
            MODIFY COLUMN password_hash VARCHAR(255) NULL COMMENT 'レガシー自前ログイン用。Supabase のみのユーザーは NULL'
        `);
        console.log('✅ users.password_hash を NULL 許可にしました。');
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

run();
