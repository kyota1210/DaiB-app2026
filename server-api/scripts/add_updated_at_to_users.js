/**
 * users に updated_at カラムを追加する。
 * 実行: node server-api/scripts/add_updated_at_to_users.js
 */
const db = require('../db');

async function columnExists(columnName) {
    const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
        [columnName]
    );
    return rows.length > 0;
}

async function run() {
    try {
        if (await columnExists('updated_at')) {
            console.log('updated_at already exists on users. Skipping.');
            return;
        }

        await db.query(`
            ALTER TABLE users
            ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            AFTER created_at
        `);
        console.log('Added updated_at.');

        await db.query(`UPDATE users SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)`);
        console.log('Initialized updated_at from created_at for existing rows.');

        console.log('Done.');
    } catch (error) {
        console.error('Failed:', error);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
