const db = require('../db');

async function addImageAdjustmentColumns() {
    try {
        console.log('Adding image adjustment columns to records table...');
        
        // カラムが既に存在するかチェック
        const checkSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'records' 
            AND COLUMN_NAME = 'aspect_ratio';
        `;
        const [rows] = await db.query(checkSql);
        
        if (rows.length > 0) {
            console.log('Image adjustment columns already exist. Skipping.');
            return;
        }
        
        // カラムを追加
        const alterSql = `
            ALTER TABLE records
            ADD COLUMN aspect_ratio VARCHAR(10) DEFAULT '1:1' AFTER image_url,
            ADD COLUMN zoom_level DECIMAL(3, 2) DEFAULT 1.00 AFTER aspect_ratio,
            ADD COLUMN position_x INT DEFAULT 0 AFTER zoom_level,
            ADD COLUMN position_y INT DEFAULT 0 AFTER position_x;
        `;
        
        await db.query(alterSql);
        console.log('Successfully added image adjustment columns.');
        
    } catch (error) {
        console.error('Failed to add image adjustment columns:', error);
    } finally {
        process.exit();
    }
}

addImageAdjustmentColumns();

