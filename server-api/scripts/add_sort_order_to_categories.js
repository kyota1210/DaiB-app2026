const db = require('../db');

async function addSortOrderToCategories() {
    try {
        console.log('Adding sort_order to categories table...');

        const [cols] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'sort_order'
        `);
        if (cols.length > 0) {
            console.log('sort_order already exists. Skipping.');
            return;
        }

        await db.query(`
            ALTER TABLE categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER name
        `);
        console.log('Added sort_order column.');

        // 既存データ: id の昇順で sort_order を 0, 1, 2, ... に設定
        const [rows] = await db.query(`
            SELECT id, user_id FROM categories ORDER BY user_id, id ASC
        `);
        for (let i = 0; i < rows.length; i++) {
            await db.query('UPDATE categories SET sort_order = ? WHERE id = ?', [i, rows[i].id]);
        }
        console.log(`Updated sort_order for ${rows.length} rows.`);
    } catch (error) {
        console.error('Failed:', error);
    } finally {
        process.exit();
    }
}

addSortOrderToCategories();
