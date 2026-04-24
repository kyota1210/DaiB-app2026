/**
 * posts から画像調整用カラム（未使用のため削除）を DROP する。
 * 実行: node server-api/scripts/drop_records_image_adjustment_columns.js
 */
const db = require('../db');

const COLUMNS = ['aspect_ratio', 'zoom_level', 'position_x', 'position_y'];

async function columnExists(columnName) {
    const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = ?`,
        [columnName]
    );
    return rows.length > 0;
}

async function run() {
    try {
        console.log('Dropping image adjustment columns from posts if present...');
        for (const col of COLUMNS) {
            if (await columnExists(col)) {
                await db.query(`ALTER TABLE posts DROP COLUMN \`${col}\``);
                console.log(`Dropped ${col}.`);
            } else {
                console.log(`${col} not present. Skipping.`);
            }
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
