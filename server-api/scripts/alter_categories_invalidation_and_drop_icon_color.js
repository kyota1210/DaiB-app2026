/**
 * categories に論理削除用カラムを追加し、icon / color を削除する。
 * 実行: node server-api/scripts/alter_categories_invalidation_and_drop_icon_color.js
 */
const db = require('../db');

async function columnExists(columnName) {
    const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = ?`,
        [columnName]
    );
    return rows.length > 0;
}

async function run() {
    try {
        console.log('Altering categories: invalidation_flag, deleted_at, drop icon/color...');

        if (!(await columnExists('invalidation_flag'))) {
            const afterCol = (await columnExists('sort_order')) ? 'sort_order' : 'name';
            await db.query(
                `ALTER TABLE categories
                ADD COLUMN invalidation_flag TINYINT(1) NOT NULL DEFAULT 0
                COMMENT '0:有効 1:無効(削除)'
                AFTER ${afterCol}`
            );
            console.log('Added invalidation_flag.');
        } else {
            console.log('invalidation_flag already exists. Skipping add.');
        }

        if (!(await columnExists('deleted_at'))) {
            await db.query(`
                ALTER TABLE categories
                ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
                COMMENT '論理削除日時'
                AFTER invalidation_flag
            `);
            console.log('Added deleted_at.');
        } else {
            console.log('deleted_at already exists. Skipping add.');
        }

        if (await columnExists('icon')) {
            await db.query('ALTER TABLE categories DROP COLUMN icon');
            console.log('Dropped icon.');
        } else {
            console.log('icon column absent. Skipping drop.');
        }

        if (await columnExists('color')) {
            await db.query('ALTER TABLE categories DROP COLUMN color');
            console.log('Dropped color.');
        } else {
            console.log('color column absent. Skipping drop.');
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
