/**
 * record_categories に updated_at / invalidation_flag / deleted_at を追加する。
 * 実行: node server-api/scripts/alter_record_categories_invalidation.js
 */
const db = require('../db');

async function columnExists(columnName) {
    const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'record_categories' AND COLUMN_NAME = ?`,
        [columnName]
    );
    return rows.length > 0;
}

async function run() {
    try {
        console.log('Altering record_categories: updated_at, invalidation_flag, deleted_at...');

        if (!(await columnExists('updated_at'))) {
            await db.query(`
                ALTER TABLE record_categories
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                AFTER created_at
            `);
            console.log('Added updated_at.');
        } else {
            console.log('updated_at already exists. Skipping add.');
        }

        if (!(await columnExists('invalidation_flag'))) {
            await db.query(`
                ALTER TABLE record_categories
                ADD COLUMN invalidation_flag TINYINT(1) NOT NULL DEFAULT 0
                COMMENT '0:有効 1:無効(削除)'
                AFTER updated_at
            `);
            console.log('Added invalidation_flag.');
        } else {
            console.log('invalidation_flag already exists. Skipping add.');
        }

        if (!(await columnExists('deleted_at'))) {
            await db.query(`
                ALTER TABLE record_categories
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
