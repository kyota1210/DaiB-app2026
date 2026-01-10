const db = require('../db');

async function createCategoryImagesTable() {
    try {
        console.log('Creating category_images table...');
        
        // テーブルが存在するか確認
        const checkSql = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'category_images';
        `;
        
        const [rows] = await db.query(checkSql);
        
        if (rows.length > 0) {
            console.log('category_images table already exists. Skipping.');
            return;
        }

        // テーブル作成SQL
        const createTableSql = `
            CREATE TABLE category_images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL UNIQUE,
                image_url VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                INDEX idx_category_id (category_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        
        await db.query(createTableSql);
        console.log('Successfully created category_images table.');
    } catch (error) {
        console.error('Failed to create table:', error);
    } finally {
        process.exit();
    }
}

createCategoryImagesTable();

