const db = require('../db');

async function createCategoriesTable() {
    try {
        console.log('Creating categories table...');
        
        // テーブルが存在するか確認
        const checkSql = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'categories';
        `;
        
        const [rows] = await db.query(checkSql);
        
        if (rows.length > 0) {
            console.log('categories table already exists. Skipping.');
            return;
        }

        // テーブル作成SQL
        const createTableSql = `
            CREATE TABLE categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(50) NOT NULL,
                sort_order INT NOT NULL DEFAULT 0,
                invalidation_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:有効 1:無効(削除)',
                deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '論理削除日時',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_user_active (user_id, invalidation_flag)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        
        await db.query(createTableSql);
        console.log('Successfully created categories table.');
    } catch (error) {
        console.error('Failed to create table:', error);
    } finally {
        process.exit();
    }
}

createCategoriesTable();
