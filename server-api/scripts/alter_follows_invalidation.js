/**
 * follows に論理削除用カラムを追加する。
 * 実行: node server-api/scripts/alter_follows_invalidation.js
 */
const db = require('../db');

async function columnExists(columnName) {
    const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follows' AND COLUMN_NAME = ?`,
        [columnName]
    );
    return rows.length > 0;
}

async function run() {
    try {
        console.log('Altering follows: invalidation_flag, deleted_at...');

        if (!(await columnExists('invalidation_flag'))) {
            await db.query(`
                ALTER TABLE follows
                ADD COLUMN invalidation_flag TINYINT(1) NOT NULL DEFAULT 0
                COMMENT '0:有効 1:無効(削除)'
                AFTER following_id
            `);
            console.log('Added invalidation_flag.');
        } else {
            console.log('invalidation_flag already exists. Skipping add.');
        }

        if (!(await columnExists('deleted_at'))) {
            await db.query(`
                ALTER TABLE follows
                ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
                COMMENT '論理削除日時'
                AFTER invalidation_flag
            `);
            console.log('Added deleted_at.');
        } else {
            console.log('deleted_at already exists. Skipping add.');
        }

        console.log('Done.');
    } catch (error) {
        console.error('Failed:', error);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
