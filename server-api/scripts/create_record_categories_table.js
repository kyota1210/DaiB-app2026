const db = require('../db');

async function createRecordCategoriesTable() {
    try {
        console.log('Creating record_categories table...');

        // テーブルが存在するか確認
        const [rows] = await db.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'record_categories'
        `);

        if (rows.length > 0) {
            console.log('record_categories table already exists. Skipping creation.');
        } else {
            await db.query(`
                CREATE TABLE record_categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    record_id INT NOT NULL,
                    category_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    invalidation_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:有効 1:無効(削除)',
                    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '論理削除日時',
                    UNIQUE KEY unique_record_category (record_id, category_id),
                    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                    INDEX idx_rc_record (record_id),
                    INDEX idx_rc_active (record_id, invalidation_flag)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('Successfully created record_categories table.');
        }

        // 既存の category_id データを record_categories に移行
        console.log('Migrating existing category_id data...');
        const [existing] = await db.query(`
            SELECT COUNT(*) as cnt FROM record_categories
        `);
        if (existing[0].cnt === 0) {
            const [migrated] = await db.query(`
                INSERT IGNORE INTO record_categories (record_id, category_id)
                SELECT id, category_id FROM records WHERE category_id IS NOT NULL
            `);
            console.log(`Migrated ${migrated.affectedRows} rows.`);
        } else {
            console.log('Migration data already exists. Skipping.');
        }

    } catch (error) {
        console.error('Failed:', error);
    } finally {
        process.exit();
    }
}

createRecordCategoriesTable();
