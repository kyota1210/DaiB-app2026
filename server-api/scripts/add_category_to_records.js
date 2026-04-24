const db = require('../db');

async function addCategoryToPosts() {
    try {
        console.log('Adding category_id column to posts table...');

        const checkSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'posts'
            AND COLUMN_NAME = 'category_id';
        `;

        const [rows] = await db.query(checkSql);

        if (rows.length > 0) {
            console.log('category_id column already exists in posts table. Skipping.');
            return;
        }

        const addColumnSql = `
            ALTER TABLE posts 
            ADD COLUMN category_id INT DEFAULT NULL;
        `;

        await db.query(addColumnSql);
        console.log('Successfully added category_id column.');

        const addForeignKeySql = `
            ALTER TABLE posts 
            ADD CONSTRAINT fk_posts_category
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
        `;

        await db.query(addForeignKeySql);
        console.log('Successfully added foreign key constraint.');
    } catch (error) {
        console.error('Failed to modify posts table:', error);
    } finally {
        process.exit();
    }
}

addCategoryToPosts();
