const db = require('../db');

async function createPostCategoriesTable() {
    try {
        console.log('Creating post_categories table...');

        const [rows] = await db.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'post_categories'
        `);

        if (rows.length > 0) {
            console.log('post_categories table already exists. Skipping creation.');
        } else {
            await db.query(`
                CREATE TABLE post_categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    post_id INT NOT NULL,
                    category_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    invalidation_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:有効 1:無効(削除)',
                    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '論理削除日時',
                    UNIQUE KEY unique_post_category (post_id, category_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                    INDEX idx_pc_post (post_id),
                    INDEX idx_pc_active (post_id, invalidation_flag)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('Successfully created post_categories table.');
        }

        console.log('Migrating existing category_id data...');
        const [existing] = await db.query(`
            SELECT COUNT(*) as cnt FROM post_categories
        `);
        if (existing[0].cnt === 0) {
            const [migrated] = await db.query(`
                INSERT IGNORE INTO post_categories (post_id, category_id)
                SELECT id, category_id FROM posts WHERE category_id IS NOT NULL
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

createPostCategoriesTable();
